# Kubernetes Deployment Guide (Minikube)

This guide walks you through deploying the **Khaana Khazana** application locally in a simulated production environment using **Minikube** and **kubectl**.

---

## 1. Prerequisites (Installation)

Open a PowerShell terminal as **Administrator** and run these commands to install the required tools using the Windows Package Manager (`winget`):

### Install kubectl (Kubernetes command-line tool)
```powershell
winget install Kubernetes.kubectl
```

### Install Minikube
```powershell
winget install -e --id Kubernetes.Minikube
```

*Note: After installation, restart your terminal so the new environment variables and path settings take effect.*

---

## 2. Step 1: Start Minikube

Start your Minikube cluster using the `docker` driver (since you have Docker Desktop running):

```powershell
minikube start --driver=docker
```

This starts a lightweight virtual environment inside Docker to act as your local Kubernetes node.

---

## 3. Step 2: Configure Your Shell to Build Images in Minikube

By default, when you run `docker build`, it saves images to your computer's local Docker daemon. Kubernetes cannot see these images. 

To build images directly inside Minikube's internal Docker daemon (so Kubernetes can access them without pushing them to a public registry like Docker Hub), run the following command in your PowerShell terminal:

```powershell
& minikube -p minikube docker-env | Invoke-Expression
```

> ⚠️ **Important**: This command only redirects your **current terminal window**. If you open a new terminal window, you must run this command again in that window before building images.

---

## 4. Step 3: Build the Microservice Images

In the same terminal where you ran the `docker-env` command, navigate to the root directory `C:\Users\admin\Desktop\Khaana-Khazana-Backend` and build the Docker images for all services:

# Build User Service
docker build -t user-service:latest ./backend/user-service

# Build Restaurant Service
docker build -t restaurant-service:latest ./backend/restaurant-service

# Build Payment Service
docker build -t payment-service:latest ./backend/payment-service

# Build Order Service
docker build -t order-service:latest ./backend/order-service

# Build Notification Service
docker build -t notification-service:latest ./backend/notification-service
```

---

## 5. Step 4: Deploy Infrastructure (Databases & Messaging)

Apply all the infrastructure manifests (PostgreSQL, MongoDB, Redis, Zookeeper, and Kafka):

```powershell
kubectl apply -f kubernetes/infra/
```

### Verify Infrastructure Startup
Wait for a couple of minutes and check if all database pods are running successfully:
```powershell
kubectl get pods
```
*(Look for Status `Running` for postgres, mongodb, redis, zookeeper, and kafka pods before proceeding).*

---

## 6. Step 5: Deploy the Application Microservices

Once the databases are up and running, apply the microservices and frontend configuration manifests:

```powershell
kubectl apply -f kubernetes/apps/
```

### Check Application Pods Status
```powershell
kubectl get pods
```
It will take a minute for the microservices to initialize. Wait until all pods show `Running` status.

---

Because the Kong API Gateway runs inside the cluster, we need to route traffic from your computer to Minikube. Thanks to the Kong Gateway, you only need to run **one** port-forwarding command:

Open a **separate terminal window** (or run this in the background) for the following port-forwarding command:

```powershell
# Forward the Kong API Gateway (routes all backend APIs on port 8000)
kubectl port-forward service/kong 8000:8000
```

---

## 8. Step 7: Access and Test the Platform

* **Run E2E Tests**: To run the automated validation test script and check database syncs:
  ```powershell
  node test_apis.js
  ```

---

## 9. Cleaning Up / Stopping the Cluster

To stop the microservices and databases without deleting your data:
```powershell
minikube stop
```

To delete the deployments and clean up all resources:
```powershell
kubectl delete -f kubernetes/apps/
kubectl delete -f kubernetes/infra/
```
