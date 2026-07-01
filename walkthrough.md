# Walkthrough - Kubernetes Setup & Kong API Gateway Integration

This walkthrough summarizes the configuration changes and files created to support local Kubernetes deployment and integrate the **Kong API Gateway** (in DB-less mode) as the central routing system.

## Changes Made

### 1. Created Kong Configuration
* **[kong/kong.yml](file:///C:/Users/admin/Desktop/Khaana-Khazana/kong/kong.yml)**: Sets up declarative DB-less routing rules:
  * `/api/auth` and `/api/users` -> `user-service` (port 5000)
  * `/api/v1/restaurants` and `/api/v1/search` -> `restaurant-service` (port 8000)
  * `/api/orders` -> `order-service` (port 8080)
  * `/api/payments` -> `payment-service` (port 3002)
  * Configures a global **Rate Limiting** plugin (100 requests per minute).
  * Configures a global **CORS** plugin to allow the React frontend on port 5173 to safely communicate with the API Gateway.

### 2. Modernized Docker Compose
* **[docker-compose.yml](file:///C:/Users/admin/Desktop/Khaana-Khazana/docker-compose.yml)**: 
  * Added the `kong` gateway service running `kong:3.4-alpine`.
  * Mounted the declarative `kong.yml` configuration as a volume.
  * Exposed port `8000` to the host machine.
  * Updated the `frontend` service to depend on the `kong` gateway.

### 3. Integrated React Frontend API Routing
* **[api.js](file:///C:/Users/admin/Desktop/Khaana-Khazana/frontend/src/services/api.js)**: Re-routed all backend API connections (user, restaurant, order, payment services, and auth token refresh calls) through the single Kong proxy address (`http://localhost:8000`) instead of direct service ports.

### 4. Created Kubernetes manifests
Organized under [kubernetes/](file:///C:/Users/admin/Desktop/Khaana-Khazana/kubernetes/):
* **[kong.yaml](file:///C:/Users/admin/Desktop/Khaana-Khazana/kubernetes/apps/kong.yaml)**: Configures the ConfigMap, Deployment, and Service to deploy Kong in DB-less mode inside the cluster.
* **[postgres-deployment.yaml](file:///C:/Users/admin/Desktop/Khaana-Khazana/kubernetes/infra/postgres-deployment.yaml)**: Recreated deployment, service, and PVC.
* **[mongo-deployment.yaml](file:///C:/Users/admin/Desktop/Khaana-Khazana/kubernetes/infra/mongo-deployment.yaml)**: Recreated deployment, service, and PVC.
* All other application manifests are fully verified, utilizing `imagePullPolicy: Never` for local builds.

### 5. Updated Documentation
* **[KUBERNETES_DEPLOYMENT.md](file:///C:/Users/admin/Desktop/Khaana-Khazana/kubernetes/KUBERNETES_DEPLOYMENT.md)**: Updated and simplified the port-forwarding instructions. Users now only need to run **two** port-forwarding commands: one for the frontend (port 5173) and one for the Kong API Gateway (port 8000).
* **[README.md](file:///C:/Users/admin/Desktop/Khaana-Khazana-Backend/README.md)**: Added a comprehensive "How the Deployment Works & Interview/Viva Q&A" section.

### 6. Session 2 Local Kubernetes Deploy & Verification
* **Standalone Minikube Bootstrapping**: Downloaded the standalone `minikube.exe` binary directly into the workspace to run local Kubernetes (v1.30.0) without requiring UAC/administrative installer rights.
* **Minikube Image Caching**: Resolved connection errors during external docker pulls by caching base database/broker/gateway images (`postgres:15-alpine`, `mongo:6-jammy`, `redis:7-alpine`, `cp-zookeeper:7.4.0`, `cp-kafka:7.4.0`, `kong:alpine`) locally on the host machine and loading them directly into the cluster (`minikube image load`).
* **Surgical Kafka Environment Fix**: Added `enableServiceLinks: false` in `kafka-deployment.yaml` to suppress automatic Kubernetes service-link env variable injection (which was injecting `KAFKA_PORT` and crashing Confluent's startup script).
* **Dynamic Route Prefix Preservation**: Set `strip_path: false` on the Kong Gateway route configurations to prevent it from stripping the `/api/auth` or `/api/v1` prefixes before forwarding to microservices.
* **Unified API E2E Testing**: Updated `test_apis.js` to route all simulated user request cycles through port `8000` (Kong API Gateway).

---

## What was Tested & Validation Results
1. **Successful Image Compilations**: Verified that the 5 polyglot microservice images compile inside Minikube's Docker daemon.
2. **Kubernetes Cluster Health**: Verified all 11 pods (Kafka, MongoDB, Postgres, Redis, ZooKeeper, Kong, and the 5 backend services) are in a fully healthy **`Running`** state.
3. **End-to-End Test Suite Execution**: Ran the updated `test_apis.js` through the port-forwarded Kong Gateway (`kubectl port-forward service/kong 8000:8000`), which returned a 100% success rate:
   - User registered & logged in successfully.
   - Auth token parsed and used to create a restaurant.
   - Created order and verified synchronous payment processing.
   - Asynchronous event flow processed by Notification Service.
4. **Git Version Control**: Verified all updated manifests, the E2E script, and the new README documentation are safely committed and pushed to the remote repository.
