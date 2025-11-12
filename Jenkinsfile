#!/usr/bin/env groovy

@Library('shared-pipeline-library') _

pipeline {
    agent {
        kubernetes {
            label 'nodejs'
            defaultContainer 'node'
        }
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        timeout(time: 1, unit: 'HOURS')
    }
    
    environment {
        AWS_REGION = 'ap-southeast-1'
        AWS_ACCOUNT_ID = '185003592665'
        IMAGE_TAG = "${env.GIT_COMMIT?.take(7) ?: 'latest'}-${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
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
                    steps {
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
                        }
                    }
                }
                
                stage('Build CMS') {
                    steps {
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
                        }
                    }
                }
                
                stage('Build Server') {
                    steps {
                        script {
                            echo '🔨 Building Server service...'
                            
                            def serverImage = buildNodeProject(
                                serviceName: 'server',
                                workDir: './Server',
                                runtime: 'bun',
                                ecrRepo: 'server',
                                imageTag: env.IMAGE_TAG,
                                buildCommand: 'bun run build'
                            )
                            
                            env.SERVER_IMAGE = serverImage.fullImageName
                            echo "✅ Server built: ${env.SERVER_IMAGE}"
                        }
                    }
                }
            }
        }
        
        stage('Update ArgoCD Manifests') {
            steps {
                script {
                    updateArgoCDManifests(
                        repoUrl: 'git@github.com:apigame-devops/application-microservices.git',
                        credentialsId: 'github-ssh-credentials',
                        environment: 'staging',
                        services: [
                            [name: 'api', imageTag: env.IMAGE_TAG],
                            [name: 'cms', imageTag: env.IMAGE_TAG],
                            [name: 'server', imageTag: env.IMAGE_TAG]
                        ]
                    )
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
                API:    ${env.API_IMAGE}
                CMS:    ${env.CMS_IMAGE}
                Server: ${env.SERVER_IMAGE}
                
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
                echo '🧹 Cleaning up...'
                
                // Clean workspace
                cleanWs(
                    deleteDirs: true,
                    patterns: [
                        [pattern: 'node_modules', type: 'INCLUDE'],
                        [pattern: '.bun', type: 'INCLUDE'],
                        [pattern: 'dist', type: 'INCLUDE'],
                        [pattern: 'build', type: 'INCLUDE']
                    ]
                )
            }
        }
    }
}
