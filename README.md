# Game System Platform

A comprehensive gaming platform built with modern technologies, featuring a complete ecosystem for game management, player interactions, and real-time gaming experiences.

## 🏗️ Architecture

### System Overview

The Game System Platform is a cloud-native microservices architecture deployed on Amazon EKS (Elastic Kubernetes Service). The platform leverages AWS Application Load Balancer (ALB) with target group binding for intelligent traffic routing and high availability.

#### **AWS EKS Production Architecture**

```mermaid
graph TB
    Internet([Global Internet Users]) --> CF[Cloudflare CDN<br/>Global Edge Network<br/>DDoS Protection]
    
    subgraph "Cloudflare Services"
        CF --> CFCache[Cloudflare Cache<br/>Static Content Caching]
        CF --> CFSec[Cloudflare Security<br/>Bot Management<br/>Rate Limiting<br/>SSL/TLS]
    end
    
    subgraph "AWS Cloud"
        CF --> WAF[AWS WAF<br/>Web Application Firewall<br/>SQL Injection Protection<br/>XSS Protection]
        WAF --> ALB[Application Load Balancer<br/>SSL Termination<br/>Health Checks]
        
        ALB --> TG1[Target Group<br/>CMS:80/443<br/>Health: /health]
        ALB --> TG2[Target Group<br/>API:80/443<br/>Health: /health]
        ALB --> TG3[Target Group<br/>GameWS:80/443<br/>Health: /health]
        
        subgraph "EKS Cluster"
            TG1 --> CMS[CMS Deployment<br/>React + Vite<br/>Replicas: 2+<br/>HPA Enabled]
            TG2 --> API[API Service<br/>Bun + Elysia<br/>Replicas: 3+<br/>HPA Enabled]
            TG3 --> Game[Game Server<br/>Bun + Elysia + WS<br/>Replicas: 3+<br/>HPA Enabled]
            
            CMS --> Service1[CMS Service<br/>ClusterIP]
            API --> Service2[API Service<br/>ClusterIP]
            Game --> Service3[Game Service<br/>ClusterIP]
        end
        
        subgraph "Data Layer"
            API --> RDS[(Amazon RDS<br/>PostgreSQL 17<br/>Multi-AZ<br/>Read Replicas)]
            Game --> RDS
            API --> Redis[(Amazon ElastiCache<br/>Redis 7 Cluster<br/>Cross-AZ Replication)]
            Game --> Redis
        end
        
        subgraph "External Services"
            API --> Atlas[(MongoDB Atlas<br/>Cloud Database<br/>Multi-Region Cluster<br/>VPC Peering)]
            Game --> Atlas
            CMS --> Atlas
        end
        
        subgraph "Monitoring & Observability"
            Prometheus[Prometheus<br/>Metrics Collection]
            Grafana[Grafana<br/>Visualization & Dashboards]
            Prometheus --> Grafana
        end
    end
    
    classDef cloudflare fill:#F38020,stroke:#fff,stroke-width:2px,color:white
    classDef awsService fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:white
    classDef k8sService fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef database fill:#3F48CC,stroke:#fff,stroke-width:2px,color:white
    classDef external fill:#00C853,stroke:#fff,stroke-width:2px,color:white
    classDef security fill:#E91E63,stroke:#fff,stroke-width:2px,color:white
    classDef monitoring fill:#9C27B0,stroke:#fff,stroke-width:2px,color:white
    
    class CF,CFCache,CFSec cloudflare
    class ALB,TG1,TG2,TG3,RDS,Redis awsService
    class WAF security
    class CMS,API,Game,Service1,Service2,Service3 k8sService
    class RDS,Redis database
    class Atlas external
    class Prometheus,Grafana monitoring
```

#### **Local Development Architecture**

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        subgraph "Application Services"
            CMS[CMS Frontend<br/>React + Vite<br/>:5173]
            API[API Service<br/>Bun + Elysia<br/>:3300]
            Game[Game Server<br/>Bun + Elysia + WS<br/>:3000]
        end
        
        subgraph "Data Layer"
            PG[(PostgreSQL<br/>Container<br/>:5432)]
            RD[(Redis<br/>Container<br/>:6379)]
            MG[(MongoDB<br/>Container<br/>:27017)]
        end
        
        subgraph "Docker Network"
            Net[game_network<br/>Bridge Network]
        end
    end
    
    subgraph "Development Access"
        Dev[Developer<br/>localhost]
    end
    
    %% Service Connections
    CMS --> API
    API --> Game
    API --> PG
    Game --> PG
    API --> RD
    Game --> RD
    API --> MG
    Game --> MG
    CMS --> MG
    
    %% Network Connections
    CMS -.-> Net
    API -.-> Net
    Game -.-> Net
    PG -.-> Net
    RD -.-> Net
    MG -.-> Net
    
    %% Developer Access
    Dev -->|:5173| CMS
    Dev -->|:3300| API
    Dev -->|:3000| Game
    Dev -->|:5432| PG
    Dev -->|:6379| RD
    Dev -->|:27017| MG
    
    classDef app fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef data fill:#3F48CC,stroke:#fff,stroke-width:2px,color:white
    classDef network fill:#FFC107,stroke:#333,stroke-width:2px
    classDef dev fill:#E3F2FD,stroke:#1976D2,stroke-width:2px
    
    class CMS,API,Game app
    class PG,RD,MG data
    class Net network
    class Dev dev
```

### Service Architecture

| Service | Technology Stack | Port | Primary Responsibilities |
|---------|-----------------|------|-------------------------|
| **🎮 Game Server** | Bun + Elysia + WebSocket | 3000 | • Real-time game logic processing<br>• WebSocket connections for live gaming<br>• Player state management<br>• Game session orchestration |
| **🔌 API Service** | Bun + Elysia + REST | 3300 | • CMS backend operations<br>• Authentication & authorization<br>• Game catalog management<br>• Player account operations<br>• Wallet & transaction APIs |
| **📱 CMS Frontend** | React + TypeScript + Vite | 5173 | • Administrative dashboard<br>• Game management interface<br>• Player account administration<br>• Analytics and reporting<br>• Real-time monitoring |
| **🐘 PostgreSQL** | PostgreSQL 17 + Alpine | 5432 | • Primary relational database<br>• Game configurations & catalog<br>• User accounts & authentication<br>• Transaction records<br>• Partner management |
| **🔴 Redis** | Redis 7 + Alpine | 6379 | • Session storage & management<br>• Real-time caching layer<br>• Game state caching<br>• Rate limiting<br>• Pub/Sub messaging |
| **🍃 MongoDB Atlas** | MongoDB 7 (Cloud) | 27017 | • Application logging<br>• Game analytics data<br>• Player behavior tracking<br>• Audit trails<br>• Performance metrics |

### Data Flow Architecture

#### **Complete System Data Flow**
```mermaid
graph LR
    subgraph "Client Layer"
        Admin[Admin User]
        Player[Game Player]
        WebClient[Web Client]
    end
    
    subgraph "Load Balancer"
        ALB[Application Load Balancer]
    end
    
    subgraph "Application Layer"
        CMS[CMS Frontend<br/>React + Vite]
        API[API Service<br/>Bun + Elysia]
        Game[Game Server<br/>Bun + Elysia + WS]
    end
    
    subgraph "Data Layer"
        RDS[(PostgreSQL<br/>RDS)]
        Redis[(Redis<br/>ElastiCache)]
    end
    
    subgraph "External Services"
        Atlas[(MongoDB Atlas<br/>Cloud Database)]
    end
    
    %% Administrative Flow
    Admin -->|HTTPS| ALB
    ALB -->|/cms/*| CMS
    CMS -->|REST API| API
    API -->|Auth/CRUD| RDS
    API -->|Session Cache| Redis
    API -->|Audit Logs| Atlas
    
    %% Gaming Flow  
    Player -->|WebSocket| ALB
    WebClient -->|HTTP/HTTPS| ALB
    ALB -->|/game/*,/ws/*| Game
    Game -->|Game State| RDS
    Game -->|Session Cache| Redis
    Game -->|Game Analytics| Atlas
    
    %% Cross-service Communication
    API -.->|Service Discovery| Game
    Game -.->|Player Data| API
    
    %% Logging Flow
    CMS -->|App Logs| Atlas
    API -->|Transaction Logs| Atlas
    Game -->|Performance Metrics| Atlas
    
    classDef client fill:#E3F2FD,stroke:#1976D2,stroke-width:2px
    classDef app fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef data fill:#3F48CC,stroke:#fff,stroke-width:2px,color:white
    classDef external fill:#00C853,stroke:#fff,stroke-width:2px,color:white
    classDef lb fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:white
    
    class Admin,Player,WebClient client
    class CMS,API,Game app
    class RDS,Redis data
    class Atlas external
    class ALB lb
```

#### **Detailed Flow Patterns**

1. **Administrative Operations Flow**
   - CMS Dashboard → ALB → API Service → PostgreSQL (CRUD operations)
   - Session management via Redis cache
   - Audit trails logged to MongoDB Atlas

2. **Real-time Gaming Flow**
   - WebSocket connections → ALB → Game Server
   - Session state cached in Redis for performance
   - Game state persisted in PostgreSQL
   - Analytics streamed to MongoDB Atlas

3. **Cross-Service Communication**
   - Internal service discovery within EKS cluster
   - Shared session data via Redis
   - Event-driven architecture for real-time updates

### Technology Choices

#### **Backend Services (Bun + Elysia)**
- **High Performance**: Bun's optimized JavaScript runtime
- **Type Safety**: Full TypeScript support
- **Modern APIs**: Elysia's elegant API design
- **Fast Startup**: Reduced cold start times
- **Memory Efficient**: Lower resource consumption

#### **Frontend (React + Vite)**
- **Developer Experience**: Hot module replacement
- **Build Performance**: Vite's fast bundling
- **Component Architecture**: React's component model
- **Type Safety**: Full TypeScript integration
- **Modern Tooling**: ESLint, Prettier integration

#### **Database Strategy**
- **PostgreSQL**: ACID compliance for critical business data
- **Redis**: Sub-millisecond caching and session management  
- **MongoDB**: Flexible schema for logs and analytics

### Deployment Architecture

#### **AWS EKS Production Deployment**

**Infrastructure Components:**
- **EKS Cluster**: Managed Kubernetes cluster with auto-scaling node groups
- **ALB Ingress Controller**: AWS Load Balancer Controller for native ALB integration
- **Target Group Binding**: Direct pod-to-ALB target group mapping
- **VPC**: Private subnets for pods, public subnets for ALB
- **IAM**: Service accounts with least-privilege permissions

**Multi-Layer Traffic Routing:**
```yaml
Cloudflare Edge Rules:
  - DDoS protection and rate limiting
  - Static content caching (JS, CSS, images)
  - Bot management and security challenges
  - Geographic access control
  - SSL/TLS encryption and HTTP/2 optimization

AWS WAF Rules:
  - SQL injection protection
  - XSS attack prevention  
  - Custom security rules for gaming APIs
  - IP reputation filtering
  - Request size and rate limiting

ALB Listener Rules:
  /cms/*     → CMS Target Group     → CMS Pods (Port 5173)
  /api/*     → API Target Group     → API Pods (Port 3300)  
  /game/*    → Game Target Group    → Game Pods (Port 3000)
  /ws/*      → Game Target Group    → Game Pods (WebSocket)

Target Group Binding:
  - Direct integration with Kubernetes services
  - Health checks at pod level (/health endpoints)
  - Automatic registration/deregistration
  - Cross-AZ load balancing with sticky sessions
  - WebSocket connection persistence
```

**Security Flow Architecture:**
```mermaid
graph LR
    subgraph "Global Users"
        User1[Web Users]
        User2[Game Players]
        User3[API Partners]
        Malicious[Malicious Traffic]
    end
    
    subgraph "Cloudflare Edge"
        CFEdge[Cloudflare Edge<br/>200+ Locations]
        CFCache[Content Cache]
        CFBot[Bot Management]
        CFRate[Rate Limiting]
        CFDDOS[DDoS Protection]
    end
    
    subgraph "AWS Security Layer"
        WAF[AWS WAF<br/>Application Firewall]
        WAFRules[Security Rules<br/>OWASP Top 10<br/>Custom Policies]
        ALB[Application Load Balancer<br/>SSL Termination]
    end
    
    subgraph "Application Layer"
        Apps[EKS Applications<br/>CMS, API, Game Server]
    end
    
    %% User Traffic Flow
    User1 --> CFEdge
    User2 --> CFEdge
    User3 --> CFEdge
    Malicious -.->|Blocked| CFEdge
    
    %% Cloudflare Processing
    CFEdge --> CFCache
    CFEdge --> CFBot
    CFEdge --> CFRate
    CFEdge --> CFDDOS
    
    %% WAF Processing
    CFEdge --> WAF
    WAF --> WAFRules
    WAFRules -->|Clean Traffic| ALB
    WAFRules -.->|Malicious Blocked| WAF
    
    %% Final Delivery
    ALB --> Apps
    
    classDef user fill:#E3F2FD,stroke:#1976D2,stroke-width:2px
    classDef cloudflare fill:#F38020,stroke:#fff,stroke-width:2px,color:white
    classDef security fill:#E91E63,stroke:#fff,stroke-width:2px,color:white
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:white
    classDef app fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef malicious fill:#F44336,stroke:#fff,stroke-width:2px,color:white
    
    class User1,User2,User3 user
    class CFEdge,CFCache,CFBot,CFRate,CFDDOS cloudflare
    class WAF,WAFRules security
    class ALB aws
    class Apps app
    class Malicious malicious
```

**Kubernetes Resources:**
```yaml
Deployments:
  - game-server-deployment (3+ replicas)
  - api-service-deployment (3+ replicas)
  - cms-frontend-deployment (2+ replicas)

Services:
  - LoadBalancer services with TargetGroupBinding annotations
  - Internal ClusterIP for pod-to-pod communication

ConfigMaps & Secrets:
  - Database connection strings
  - JWT secrets and API keys
  - Service discovery endpoints

Persistent Volumes:
  - EBS CSI driver for stateful workloads
  - EFS for shared file storage
```

**Managed Data Services:**
```yaml
Amazon RDS PostgreSQL:
  - Multi-AZ deployment for high availability
  - Automated backups and point-in-time recovery
  - Read replicas for scaling read operations

Amazon ElastiCache Redis:
  - Cluster mode for horizontal scaling  
  - Automatic failover and backup
  - VPC security groups for network isolation

MongoDB Atlas (External):
  - Global cloud database service
  - Multi-region deployment with automatic failover
  - Built-in security with encryption at rest/transit
  - Performance monitoring and optimization
  - Automated backups and point-in-time recovery
  - VPC peering for secure AWS integration
```

#### **Local Development (Docker Compose)**
```yaml
Networks:
  game_network: # Internal container communication

Volumes:
  postgres_data: # Database persistence
  redis_data:    # Cache persistence  
  mongo_data:    # Logs persistence

Health Checks:
  - Application endpoints (/health)
  - Database connectivity
  - Service dependencies
```

#### **Service Dependencies (Both Environments)**
```
┌─────────────────┐
│   Game Server   │ ──┐
└─────────────────┘   │
                      │
┌─────────────────┐   │   ┌─────────────────┐
│   API Service   │ ──┼──→│   PostgreSQL    │
└─────────────────┘   │   └─────────────────┘
                      │
┌─────────────────┐   │   ┌─────────────────┐
│  CMS Frontend   │ ──┘   │     Redis       │
└─────────────────┘       └─────────────────┘
                          
                          ┌─────────────────┐
                          │    MongoDB      │
                          └─────────────────┘
```

### Security Architecture

#### **Authentication Flow**
1. **CMS Login**: JWT-based authentication with refresh tokens
2. **API Security**: HMAC-SHA256 signed requests for partner APIs
3. **Session Management**: Redis-based session storage
4. **Environment Isolation**: Containerized service boundaries

#### **Multi-Layer Security Architecture (Production)**

**Layer 1 - Cloudflare Edge Security:**
- **DDoS Protection**: Automatic mitigation of L3/L4/L7 attacks
- **Bot Management**: Advanced bot detection and challenge system
- **Rate Limiting**: API rate limiting and abuse prevention
- **SSL/TLS**: Universal SSL with automatic certificate management
- **Cache Shield**: Global CDN with intelligent caching
- **Firewall Rules**: Custom security rules and geo-blocking

**Layer 2 - AWS WAF (Web Application Firewall):**
- **OWASP Top 10**: Protection against common web vulnerabilities
- **SQL Injection**: Real-time detection and blocking
- **XSS Protection**: Cross-site scripting attack prevention
- **Custom Rules**: Application-specific security policies
- **IP Reputation**: Automatic blocking of malicious IPs
- **Geographic Filtering**: Country-based access control

**Layer 3 - AWS Network Security:**
- **VPC Security**: Private subnets, security groups, NACLs
- **ALB Security**: SSL/TLS termination with ACM certificates
- **Security Groups**: Fine-grained port and protocol control
- **VPC Flow Logs**: Network traffic monitoring and analysis

**Layer 4 - Kubernetes Security:**
- **Pod Security Standards**: Enforced security policies
- **Network Policies**: Micro-segmentation within cluster
- **RBAC**: Role-based access control for resources
- **Service Mesh**: Optional Istio for advanced security

**Layer 5 - Application Security:**
- **Secrets Management**: AWS Secrets Manager with CSI driver
- **Identity & Access**: IAM roles for service accounts (IRSA)
- **Encryption**: 
  - EBS volumes encrypted with AWS KMS
  - RDS encryption at rest and in transit
  - MongoDB Atlas encryption with customer keys
- **Monitoring**: Prometheus metrics, Grafana dashboards, GuardDuty

#### **Local Development Security**
- **Encryption**: All passwords hashed with bcrypt
- **Secret Management**: Environment-based configuration (.env)
- **Network Security**: Internal Docker network isolation
- **Access Control**: Role-based permission system
- **MongoDB Atlas**: Secure connection strings and IP whitelisting

### MongoDB Atlas Integration

#### **Atlas Configuration**
```yaml
Connection Security:
  - Database user authentication with strong passwords
  - IP access list (whitelist) for EKS cluster
  - VPC peering for private network access
  - Connection string encryption (TLS/SSL)

Data Security:
  - Encryption at rest with customer-managed keys
  - Encryption in transit (TLS 1.2+)
  - Field-level encryption for sensitive data
  - GDPR and compliance-ready features

Performance & Monitoring:
  - Real-time performance advisor
  - Query performance insights
  - Automated index suggestions
  - Custom alerts and monitoring

Backup & Recovery:
  - Continuous backup with point-in-time recovery
  - Cross-region backup replication
  - Automated backup scheduling
  - Instant backup restoration
```

#### **Atlas Connection Pattern**
```mermaid
graph LR
    subgraph "EKS Cluster"
        Pod1[API Service Pod]
        Pod2[Game Server Pod]
        Pod3[CMS Pod]
    end
    
    subgraph "Network Security"
        VPC[AWS VPC<br/>Private Subnets]
        NAT[NAT Gateway<br/>Public Internet]
        Peering[VPC Peering<br/>Optional]
    end
    
    subgraph "MongoDB Atlas"
        Atlas[(MongoDB Atlas<br/>Multi-Region Cluster)]
        Backup[(Automated Backups<br/>Point-in-time Recovery)]
    end
    
    Pod1 --> VPC
    Pod2 --> VPC
    Pod3 --> VPC
    VPC --> NAT
    VPC -.-> Peering
    NAT -->|TLS 1.2+<br/>IP Whitelist| Atlas
    Peering -.->|Private Network| Atlas
    Atlas --> Backup
    
    classDef k8s fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef network fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:white
    classDef atlas fill:#00C853,stroke:#fff,stroke-width:2px,color:white
    
    class Pod1,Pod2,Pod3 k8s
    class VPC,NAT,Peering network
    class Atlas,Backup atlas
```

#### **Environment Configuration**
```bash
# MongoDB Atlas Connection (Production)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/gamedb?retryWrites=true&w=majority
MONGO_DB_NAME=gamedb

# Atlas-specific settings
MONGO_SSL=true
MONGO_AUTH_SOURCE=admin
MONGO_RETRY_WRITES=true
MONGO_READ_PREFERENCE=primary
```

### Cloudflare & WAF Configuration

#### **Cloudflare Setup**
```yaml
DNS Configuration:
  - A Record: game.yourdomain.com → ALB IP
  - CNAME: api.yourdomain.com → game.yourdomain.com
  - CNAME: cms.yourdomain.com → game.yourdomain.com
  - Proxy Status: Enabled (Orange Cloud)

Security Settings:
  - SSL/TLS Mode: Full (Strict)
  - Always Use HTTPS: Enabled
  - Minimum TLS Version: 1.2
  - HTTP Strict Transport Security (HSTS): Enabled
  - Authenticated Origin Pulls: Enabled

Performance Optimization:
  - Caching Level: Standard
  - Browser Cache TTL: 4 hours
  - Auto Minify: HTML, CSS, JS
  - Brotli Compression: Enabled
  - HTTP/2: Enabled
  - HTTP/3 (QUIC): Enabled

Bot Management:
  - Bot Fight Mode: Enabled
  - Super Bot Fight Mode: Enabled (Enterprise)
  - Challenge Passage: 30 minutes
  - Rate Limiting: 100 req/min per IP
```

#### **AWS WAF Configuration**
```yaml
# WAF Web ACL Configuration
apiVersion: wafv2.aws.crossplane.io/v1alpha1
kind: WebACL
metadata:
  name: game-system-waf
spec:
  scope: REGIONAL
  defaultAction:
    allow: {}
  
  rules:
  - name: AWSManagedRulesCommonRuleSet
    priority: 1
    overrideAction:
      none: {}
    statement:
      managedRuleGroupStatement:
        vendorName: AWS
        name: AWSManagedRulesCommonRuleSet
  
  - name: AWSManagedRulesKnownBadInputsRuleSet
    priority: 2
    overrideAction:
      none: {}
    statement:
      managedRuleGroupStatement:
        vendorName: AWS
        name: AWSManagedRulesKnownBadInputsRuleSet
  
  - name: AWSManagedRulesSQLiRuleSet
    priority: 3
    overrideAction:
      none: {}
    statement:
      managedRuleGroupStatement:
        vendorName: AWS
        name: AWSManagedRulesSQLiRuleSet
  
  - name: GameAPIRateLimit
    priority: 4
    action:
      block: {}
    statement:
      rateBasedStatement:
        limit: 2000
        aggregateKeyType: IP
        scopeDownStatement:
          byteMatchStatement:
            searchString: "/api/game"
            fieldToMatch:
              uriPath: {}
            textTransformations:
            - priority: 0
              type: LOWERCASE
  
  - name: AdminPanelIPRestriction
    priority: 5
    action:
      allow: {}
    statement:
      andStatement:
        statements:
        - byteMatchStatement:
            searchString: "/cms"
            fieldToMatch:
              uriPath: {}
            textTransformations:
            - priority: 0
              type: LOWERCASE
        - ipSetReferenceStatement:
            arn: "arn:aws:wafv2:region:account:regional/ipset/admin-ips/xxx"

  visibilityConfig:
    sampledRequestsEnabled: true
    cloudWatchMetricsEnabled: true
    metricName: GameSystemWAF
```

#### **Cloudflare Security Rules**
```javascript
// Custom Cloudflare Rule Examples

// 1. Gaming API Rate Limiting
if (http.request.uri.path matches "^/api/game/") {
  rate_limit(
    key: cf.client.ip,
    threshold: 100,
    period: 60,
    action: "challenge"
  )
}

// 2. Admin Panel Geographic Restriction  
if (http.request.uri.path matches "^/cms" and ip.geoip.country ne "US" and ip.geoip.country ne "CA") {
  return "block"
}

// 3. WebSocket Connection Security
if (http.request.upgrade eq "websocket" and cf.bot_management.score lt 30) {
  return "challenge"
}

// 4. API Key Validation
if (http.request.uri.path matches "^/api/" and not http.request.headers["x-api-key"]) {
  return "block"
}

// 5. DDoS Protection for Game Endpoints
if (http.request.uri.path matches "^/game/" and cf.threat_score gt 50) {
  return "challenge"
}
```

#### **Monitoring and Alerting**
```yaml
Prometheus Metrics & Grafana Dashboards:
  - Application metrics (API response times, error rates)
  - Infrastructure metrics (CPU, memory, network)
  - Custom gaming metrics (active players, game sessions)
  - Database performance metrics (query times, connections)
  - Redis cache hit rates and connection pools
  - Kubernetes cluster metrics (pod health, resource usage)

Grafana Alerts:
  - High error rates > 5% over 5min
  - Response time > 500ms sustained
  - High resource utilization > 80%
  - Database connection pool exhaustion
  - Redis memory usage > 90%
  - Pod restart frequency

Cloudflare Analytics:
  - Security Events Dashboard
  - Bot Traffic Analysis
  - Performance Metrics
  - Cache Hit Ratio Monitoring

Log Aggregation:
  - Application logs → ELK Stack / Loki
  - Cloudflare logs → Log aggregation platform
  - EKS audit logs → Centralized logging
  - Database query logs → Performance analysis
```

### Monitoring & Observability Architecture

#### **Prometheus & Grafana Stack**
```mermaid
graph TB
    subgraph "EKS Cluster"
        subgraph "Application Pods"
            API[API Service<br/>:3300/metrics]
            Game[Game Server<br/>:3000/metrics]
            CMS[CMS Frontend<br/>Nginx metrics]
        end
        
        subgraph "Monitoring Stack"
            Prometheus[Prometheus Server<br/>Metrics Collection<br/>Data Retention]
            Grafana[Grafana<br/>Dashboards & Alerts<br/>Visualization]
            AlertManager[Alert Manager<br/>Notification Routing]
        end
        
        subgraph "System Monitoring"
            NodeExporter[Node Exporter<br/>System Metrics]
            KubeState[Kube State Metrics<br/>K8s Resource Metrics]
            CAdvisor[cAdvisor<br/>Container Metrics]
        end
    end
    
    subgraph "External Services"
        RDS[Amazon RDS<br/>CloudWatch Exporter]
        Redis[ElastiCache<br/>Redis Exporter]
        Atlas[MongoDB Atlas<br/>MongoDB Exporter]
    end
    
    subgraph "Alerting Channels"
        Slack[Slack Notifications]
        Email[Email Alerts]
        PagerDuty[PagerDuty<br/>Critical Alerts]
    end
    
    %% Metrics Collection
    API --> Prometheus
    Game --> Prometheus
    CMS --> Prometheus
    NodeExporter --> Prometheus
    KubeState --> Prometheus
    CAdvisor --> Prometheus
    RDS --> Prometheus
    Redis --> Prometheus
    Atlas --> Prometheus
    
    %% Visualization & Alerting
    Prometheus --> Grafana
    Prometheus --> AlertManager
    AlertManager --> Slack
    AlertManager --> Email
    AlertManager --> PagerDuty
    
    classDef app fill:#326CE5,stroke:#fff,stroke-width:2px,color:white
    classDef monitoring fill:#9C27B0,stroke:#fff,stroke-width:2px,color:white
    classDef external fill:#00C853,stroke:#fff,stroke-width:2px,color:white
    classDef alerting fill:#FF5722,stroke:#fff,stroke-width:2px,color:white
    
    class API,Game,CMS app
    class Prometheus,Grafana,AlertManager,NodeExporter,KubeState,CAdvisor monitoring
    class RDS,Redis,Atlas external
    class Slack,Email,PagerDuty alerting
```

#### **Key Metrics & Dashboards**
```yaml
Application Metrics:
  - HTTP request rate, latency, and error rate (RED metrics)
  - WebSocket connection count and message throughput
  - Authentication success/failure rates
  - Game session duration and player activity
  - API endpoint performance breakdown

Infrastructure Metrics:
  - CPU and memory utilization per pod/node
  - Network I/O and disk usage
  - Kubernetes pod restarts and scheduling delays
  - Load balancer request distribution
  - Database connection pool status

Business Metrics:
  - Active concurrent players
  - Game session creation rate
  - Revenue/transaction volume
  - User registration and retention rates
  - Geographic distribution of users

Security Metrics:
  - Failed authentication attempts
  - Blocked requests by WAF/Cloudflare
  - Unusual traffic patterns
  - Security rule triggers
```

#### **Grafana Dashboard Configuration**
```yaml
# Gaming Platform Overview Dashboard
apiVersion: v1
kind: ConfigMap
metadata:
  name: gaming-dashboard
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Gaming Platform Overview",
        "panels": [
          {
            "title": "Active Players",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(game_active_players)",
                "legendFormat": "Total Players"
              }
            ]
          },
          {
            "title": "API Response Time",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                "legendFormat": "95th percentile"
              }
            ]
          },
          {
            "title": "Database Connections",
            "type": "graph",
            "targets": [
              {
                "expr": "pg_stat_database_numbackends",
                "legendFormat": "PostgreSQL Connections"
              }
            ]
          }
        ]
      }
    }
```

### EKS Deployment Configuration

#### **ALB Target Group Binding Example**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: game-server-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb-ip"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
  - name: websocket  
    port: 443
    targetPort: 3000
    protocol: TCP
  selector:
    app: game-server

---
apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: game-server-tgb
spec:
  serviceRef:
    name: game-server-service
    port: 80
  targetGroupARN: arn:aws:elasticloadbalancing:region:account:targetgroup/game-server-tg/xxx
  targetType: ip
  vpcID: vpc-xxxxxxxxx
```

#### **Ingress Configuration with ALB**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: game-system-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:region:account:certificate/xxx
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
spec:
  rules:
  - host: game.yourdomain.com
    http:
      paths:
      - path: /cms
        pathType: Prefix
        backend:
          service:
            name: cms-service
            port:
              number: 80
      - path: /api
        pathType: Prefix  
        backend:
          service:
            name: api-service
            port:
              number: 80
      - path: /game
        pathType: Prefix
        backend:
          service:
            name: game-server-service
            port:
              number: 80
```

#### **Scaling Configuration**
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: game-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: game-server-deployment
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

# Cluster Autoscaler for nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  annotations:
    cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Make (usually pre-installed on macOS/Linux)
- At least 4GB RAM
- Available ports: Check `.env` file for current port configuration

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd apigamesystem
   ```

2. **Set up environment:**
   ```bash
   make setup-env  # Create .env from template
   # Edit .env and update all passwords/secrets!
   ```

3. **Start all services:**
   ```bash
   make install    # First-time setup with checks
   # or
   make start      # Quick start
   ```

4. **Verify all services are healthy:**
   ```bash
   make status     # Check service status
   make health     # Check health endpoints
   ```

5. **Access the platform:**
   ```bash
   make urls       # Display all service URLs and credentials
   ```
   - **CMS Dashboard**: http://localhost:5173
   - **API Health Check**: http://localhost:3300/health
   - **Game Server Health**: http://localhost:3000/health

## 🔐 Access Credentials

### CMS Admin Login
- **URL**: http://localhost:5173
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Super Administrator

### API Authentication
```bash
curl -X POST http://localhost:3300/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## ⚙️ Configuration

All system configuration is centralized in a `.env` file (created from `.env.template`):

- **Service Ports**: API, Server, CMS, and database ports
- **Database Credentials**: PostgreSQL, Redis, MongoDB connection details
- **JWT Secrets**: Authentication and session management
- **Service URLs**: Internal and external service communication

### Initial Setup
```bash
# Create environment file from template
make setup-env

# Edit configuration (REQUIRED!)
nano .env

# Validate configuration
make check-env

# Check port availability
make check-ports
```

### ⚠️ Security Requirements
**IMPORTANT**: After running `make setup-env`, you MUST update these values in `.env`:
- `POSTGRES_PASSWORD` - Strong database password
- `REDIS_PASSWORD` - Strong Redis password  
- `JWT_SECRET` - Long random string for JWT signing
- `JWT_ACCESS_SECRET` - Long random string for access tokens
- `JWT_REFRESH_SECRET` - Long random string for refresh tokens

### Environment File Management
```bash
# Set up initial environment
make setup-env

# Check Git status of environment files
make git-status

# Clean up old individual .env files
make clean-env

# Validate current configuration
make check-env
```

### Production Deployment
```bash
# Create production environment template
make env-production

# Edit .env.production with real production values
nano .env.production

# Deploy with production environment
cp .env.production .env
make start
```

**Production Checklist:**
1. ✅ Update all passwords with strong, unique values
2. ✅ Generate secure JWT secrets (use random strings)
3. ✅ Set `NODE_ENV=production`
4. ✅ Update domain names for production URLs
5. ✅ Never commit `.env` or `.env.production` to Git!

## 🛠️ Development

### Available Make Commands
```bash
# Get help with all available commands
make help

# Basic operations
make start          # Start all services
make stop           # Stop services (preserve data)
make restart        # Restart all services
make status         # Show service status
make urls           # Display service URLs

# Development
make dev            # Start with logs
make rebuild        # Rebuild and restart
make logs           # View all logs
make logs-api       # View API logs only
make health         # Check service health

# Database access
make db-postgres    # Connect to PostgreSQL
make db-mongo       # Connect to MongoDB  
make db-redis       # Connect to Redis CLI

# Container shells
make shell-api      # Open shell in API container
make shell-server   # Open shell in Server container
make shell-cms      # Open shell in CMS container

# Maintenance
make backup-db      # Backup PostgreSQL database
make clean          # Remove all data (destructive)
make test-api       # Test API endpoints
```

## 📊 Database Schema

The PostgreSQL database includes 9 core tables:
- `admin_users` - CMS user accounts
- `admin_sessions` - Authentication sessions  
- `games` - Game catalog and configurations
- `partners` - API partner accounts
- `partner_games` - Partner-specific game settings
- `partner_sessions` - Partner authentication
- `players` - Game players
- `player_accounts` - Player wallet accounts
- `account_ledger` - Transaction history

## 🎮 Game Server API

### Partner Authentication Required
All Server API endpoints require signed requests with these headers:
- `x-api-key`: Partner API key
- `x-timestamp`: Request timestamp
- `x-signature`: HMAC-SHA256 signature

### Available Partners
| Partner | API Key | Secret Key |
|---------|---------|-----------|
| Partner ABC | `partner_abc` | `74286262f408` |
| Partner Test | `partner_test` | `[check database]` |

### Example API Usage
```bash
# Generate signature and test user registration
# See test-server-auth.js for signature generation
```

## 🔧 API Endpoints

### CMS API (Port 3300)
- `GET /health` - Service health check
- `POST /api/auth/login` - Admin authentication
- `POST /api/auth/refresh` - Token refresh
- `GET /api/games` - Game catalog
- `GET /api/players/:id` - Player information
- `POST /api/wallets/:id/deposit` - Wallet transactions

### Game Server (Port 3000)  
- `GET /health` - Service health check
- `POST /api/user/register` - Player registration
- `POST /api/user/login` - Player authentication
- `POST /api/user/token` - Token consumption

## 🚨 Troubleshooting

### Service Status Issues
```bash
# Check if all containers are running
docker-compose ps

# Check service logs for errors
docker-compose logs api
docker-compose logs server
```

### Database Connection Issues
```bash
# Verify database connectivity
docker-compose exec api bun run --env-file=.env -e "console.log('Testing DB connection...')"

# Check database tables
docker-compose exec postgres psql -U gameserver -d game -c "\dt"
```

### CMS Proxy Issues
If CMS cannot reach the API service:
1. Use direct API access: http://localhost:3300/api/*
2. Check network connectivity: `docker-compose exec cms ping api`
3. Verify environment variables in CMS container

### Health Check Failures
If services show as unhealthy:
```bash
# Rebuild containers (health checks use wget, not curl)
docker-compose build
docker-compose up -d
```

## 🔒 Security Notes

### Development Environment
- Default passwords are set for development convenience
- All services run with development configurations
- CORS is enabled for cross-origin requests

### Production Deployment
Before production deployment:
1. Change all default passwords
2. Use environment-specific configurations
3. Enable SSL/TLS encryption
4. Implement proper logging and monitoring
5. Set up backup strategies for databases
6. Review and harden security settings

## 📈 Monitoring & Observability

### Monitoring Stack
- **Prometheus**: Metrics collection and storage with 15-day retention
- **Grafana**: Real-time dashboards and visualization
- **Alert Manager**: Intelligent alert routing and silencing
- **Node Exporter**: System-level metrics collection
- **Kube State Metrics**: Kubernetes resource metrics

### Key Dashboards
- **Gaming Platform Overview**: Active players, session metrics, revenue
- **Infrastructure Health**: CPU, memory, network, storage utilization  
- **Application Performance**: API response times, error rates, throughput
- **Database Monitoring**: Query performance, connection pools, slow queries
- **Security Events**: Failed logins, blocked requests, unusual patterns

### Service Health Checks
All services include health check endpoints that verify:
- Service availability (`/health` endpoints)
- Database connectivity and query performance
- Redis/MongoDB connections and response times
- External service dependencies (MongoDB Atlas)

### Alerting Strategy
- **Critical**: System down, database unavailable, high error rates
- **Warning**: High resource usage, slow response times, connection issues
- **Info**: Deployment events, scaling activities, maintenance windows

### Log Management
- **Application Logs**: Structured JSON logs with correlation IDs
- **Database Logs**: Query performance and error tracking
- **Game Analytics**: Player behavior and session data
- **Security Logs**: Authentication events and security incidents
- **Infrastructure Logs**: Kubernetes events and system messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## 📄 License

[Add your license information here]

---

**Happy Gaming! 🎮🚀**