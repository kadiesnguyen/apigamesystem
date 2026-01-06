#!/usr/bin/env groovy

@Library('shared-pipeline-library') _

pipeline {
    agent none  // No default agent - each stage gets its own
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
        timeout(time: 1, unit: 'HOURS')
    }
    
    environment {
        AWS_REGION = 'ap-southeast-1'
        AWS_ACCOUNT_ID = '185003592665'
    }
    
    stages {
        stage('Prepare') {
            agent {
                kubernetes {
                    label 'nodejs-prepare'
                    defaultContainer 'node'
                }
            }
            steps {
                echo '📥 Checking out source code...'
                checkout scm
                
                script {
                    // Get Git info for notifications
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_AUTHOR = sh(
                        script: "git log -1 --pretty=format:'%an'",
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_MESSAGE = sh(
                        script: "git log -1 --pretty=format:'%s'",
                        returnStdout: true
                    ).trim()
                    
                    // Set IMAGE_TAG with git commit hash
                    env.IMAGE_TAG = "${env.GIT_COMMIT_SHORT}-${env.BUILD_NUMBER}"
                }
                
                echo """
                ==========================================
                Build Information
                ==========================================
                Commit:  ${env.GIT_COMMIT_SHORT}
                Author:  ${env.GIT_AUTHOR}
                Message: ${env.GIT_MESSAGE}
                Tag:     ${env.IMAGE_TAG}
                ==========================================
                """
            }
        }
        
        stage('Build Services') {
            parallel {
                stage('Build API') {
                    agent {
                        kubernetes {
                            label 'nodejs-api'
                            defaultContainer 'node'
                        }
                    }
                    steps {
                        checkout scm
                        script {
                            echo '🔨 Building API service...'
                            
                            def apiImage = buildNodeProject(
                                serviceName: 'api',
                                workDir: './api',
                                runtime: 'bun',
                                ecrRepo: 'api',
                                imageTag: env.IMAGE_TAG,
                                buildCommand: 'bun run build'
                            )
                            
                            env.API_IMAGE = apiImage.fullImageName
                            echo "✅ API built: ${env.API_IMAGE}"
                            
                            // Update ArgoCD manifest immediately after build
                            echo '📝 Updating API ArgoCD manifest...'
                            updateArgoCDManifests(
                                repoUrl: 'git@github.com:apigame-devops/application-microservices.git',
                                credentialsId: 'github-ssh-credentials',
                                environment: 'staging',
                                serviceName: 'api',
                                imageTag: env.IMAGE_TAG,
                                workDir: 'gitops-repo-api'
                            )
                            echo "✅ API manifest updated"
                        }
                    }
                }
                
                stage('Build CMS') {
                    agent {
                        kubernetes {
                            label 'nodejs-cms'
                            defaultContainer 'node'
                        }
                    }
                    steps {
                        checkout scm
                        script {
                            echo '🔨 Building CMS service...'
                            
                            def cmsImage = buildNodeProject(
                                serviceName: 'cms',
                                workDir: './cms',
                                runtime: 'npm',
                                ecrRepo: 'cms',
                                imageTag: env.IMAGE_TAG,
                                buildCommand: 'npm run build'
                            )
                            
                            env.CMS_IMAGE = cmsImage.fullImageName
                            echo "✅ CMS built: ${env.CMS_IMAGE}"
                            
                            // Update ArgoCD manifest immediately after build
                            echo '📝 Updating CMS ArgoCD manifest...'
                            updateArgoCDManifests(
                                repoUrl: 'git@github.com:apigame-devops/application-microservices.git',
                                credentialsId: 'github-ssh-credentials',
                                environment: 'staging',
                                serviceName: 'cms',
                                imageTag: env.IMAGE_TAG,
                                workDir: 'gitops-repo-cms'
                            )
                            echo "✅ CMS manifest updated"
                        }
                    }
                }
                
                stage('Build Server') {
                    agent {
                        kubernetes {
                            label 'nodejs-server'
                            defaultContainer 'node'
                        }
                    }
                    steps {
                        checkout scm
                        script {
                            echo '🔨 Building Server service...'
                            
                            def serverImage = buildNodeProject(
                                serviceName: 'server',
                                workDir: './gameserver',
                                runtime: 'bun',
                                ecrRepo: 'server',
                                imageTag: env.IMAGE_TAG,
                                buildCommand: 'bun run build'
                            )
                            
                            env.SERVER_IMAGE = serverImage.fullImageName
                            echo "✅ Server built: ${env.SERVER_IMAGE}"
                            
                            // Update ArgoCD manifest immediately after build
                            echo '📝 Updating Server ArgoCD manifest...'
                            updateArgoCDManifests(
                                repoUrl: 'git@github.com:apigame-devops/application-microservices.git',
                                credentialsId: 'github-ssh-credentials',
                                environment: 'staging',
                                serviceName: 'server',
                                imageTag: env.IMAGE_TAG,
                                workDir: 'gitops-repo-server'
                            )
                            echo "✅ Server manifest updated"
                        }
                    }
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo '✅ Build completed successfully!'
                echo """
                ==========================================
                Build Summary
                ==========================================
                API:       ${env.API_IMAGE}
                CMS:       ${env.CMS_IMAGE}
                Server:    ${env.SERVER_IMAGE}
                
                Commit: ${env.GIT_COMMIT_SHORT} by ${env.GIT_AUTHOR}
                Message: ${env.GIT_MESSAGE}
                ==========================================
                """
            }
        }
        
        failure {
            script {
                echo '❌ Build failed!'
                echo """
                ==========================================
                Build Failed
                ==========================================
                Please check the logs for details.
                
                Commit: ${env.GIT_COMMIT_SHORT} by ${env.GIT_AUTHOR}
                Message: ${env.GIT_MESSAGE}
                ==========================================
                """
            }
        }
        
        unstable {
            script {
                echo '⚠️ Build completed with warnings'
            }
        }
        
        always {
            script {
                echo '✅ Pipeline completed'
                echo 'Note: Individual agent pods are automatically cleaned up by Kubernetes'
            }
        }
    }
}