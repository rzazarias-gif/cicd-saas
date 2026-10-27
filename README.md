# CI/CD SaaS — Plateforme de déploiement continu basée sur Kubernetes

## 1. Présentation du projet

Ce projet consiste à concevoir et mettre en œuvre une plateforme de déploiement continu (CI/CD) basée sur Kubernetes et Tekton.

L'objectif est d'automatiser les principales étapes du cycle de livraison d'une application : récupération du code source, exécution des tests, construction de l'image conteneur et déploiement sur un cluster Kubernetes.

La plateforme utilise un dépôt GitHub comme source de code. Lorsqu'un événement `push` est détecté sur la branche `main`, un webhook transmet l'événement à Tekton Triggers, qui déclenche l'exécution du pipeline.

Le projet constitue un prototype fonctionnel destiné à démontrer l'automatisation du processus CI/CD dans un environnement Kubernetes local.

## 2. Objectifs

- Automatiser la récupération du code source depuis GitHub.
- Exécuter automatiquement les tests de l'application.
- Construire et publier une image conteneur.
- Déployer l'application sur Kubernetes.
- Déclencher le pipeline à la suite d'un `push` sur GitHub.
- Utiliser les ressources Kubernetes pour isoler et orchestrer les composants.

## 3. Architecture technique

### Technologies utilisées

| Technologie | Rôle |
|---|---|
| Kubernetes | Orchestration des conteneurs et gestion des déploiements |
| Minikube | Exécution locale du cluster Kubernetes |
| Tekton Pipelines | Définition et exécution du pipeline CI/CD |
| Tekton Triggers | Déclenchement du pipeline à partir d'événements GitHub |
| Buildah | Construction et publication des images conteneur |
| Node.js | Environnement d'exécution de l'application |
| Express | Framework backend de l'application de démonstration |
| Docker | Environnement de conteneurisation et pilote de Minikube |
| Git et GitHub | Gestion du code source et déclenchement du pipeline |
| ngrok | Exposition temporaire du listener local pour recevoir les webhooks GitHub |

### Chaîne CI/CD

```text
Développeur
    |
    | git push
    v
Dépôt GitHub
    |
    | Webhook push sur main
    v
ngrok
    |
    v
Tekton EventListener
    |
    v
Tekton Triggers
    |
    v
Pipeline Tekton
    |
    +--> 1. Clonage du dépôt
    |
    +--> 2. Installation des dépendances et tests
    |
    +--> 3. Construction de l'image avec Buildah
    |
    +--> 4. Publication dans le registre
    |
    +--> 5. Mise à jour du déploiement Kubernetes
    |
    v
Application déployée
```

## 4. Structure du dépôt

```text
cicd-saas/
├── demo-app/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── test.js
├── kubernetes/
│   ├── demo-app-deployment.yaml
│   ├── demo-app-service.yaml
│   └── tekton-deploy-rbac.yaml
├── pipelines/
│   ├── event-listener.yaml
│   ├── pipeline-real.yaml
│   ├── source-pvc.yaml
│   ├── trigger-binding.yaml
│   ├── trigger-template.yaml
│   ├── trigger-rbac.yaml
│   ├── trigger-listener-read-rbac.yaml
│   └── tasks/
│       ├── build-image.yaml
│       ├── clone-repo.yaml
│       ├── deploy-app.yaml
│       └── test-source.yaml
├── .gitignore
└── README.md
```

Le dépôt contient également des manifestes historiques utilisés pendant les premières étapes de développement et de validation de Tekton.

## 5. Fonctionnement du pipeline

### Étape 1 — Clonage du dépôt

La tâche `clone-public-repo` récupère le code source depuis GitHub et le place dans un espace de travail partagé.

Elle vérifie notamment la présence du fichier `demo-app/package.json`.

### Étape 2 — Tests

La tâche `test-source` utilise Node.js pour installer les dépendances et exécuter les tests automatisés avec :

```bash
npm ci
npm test
```

Le pipeline poursuit son exécution uniquement lorsque cette tâche réussit.

### Étape 3 — Construction et publication de l'image

La tâche `build-image` utilise Buildah pour construire l'image à partir du Dockerfile de l'application.

L'image est ensuite publiée dans le registre accessible depuis le cluster Minikube.

L'adresse du registre définie dans la configuration actuelle est :

```text
10.105.205.220:80/demo-app:1.0
```

Cette adresse correspond à l'environnement local utilisé pour le prototype. Elle doit être adaptée à la configuration du registre lors d'une installation sur un autre cluster.

### Étape 4 — Déploiement Kubernetes

La tâche `deploy-app` met à jour l'image du déploiement `demo-app` à l'aide de `kubectl set image`.

Elle attend ensuite la fin du déploiement avec `kubectl rollout status`.

Si le déploiement échoue, la tâche signale l'échec du pipeline.

## 6. Déclenchement automatique depuis GitHub

Tekton Triggers reçoit les événements transmis par GitHub grâce à un `EventListener`.

Le mécanisme comprend trois ressources principales :

- **TriggerBinding** : extrait l'URL du dépôt et la référence Git depuis l'événement.
- **TriggerTemplate** : définit le `PipelineRun` à créer.
- **EventListener** : reçoit les événements et applique le filtre configuré.

Le listener actuel accepte les événements `push` associés à la branche `main`.

Pour rendre le listener accessible à GitHub dans l'environnement local, ngrok fournit une URL HTTPS temporaire redirigée vers le service du listener.

## 7. Prérequis

Les outils suivants sont nécessaires pour reproduire l'environnement :

- Git
- Docker
- kubectl
- Minikube
- Tekton Pipelines
- Tekton Triggers
- ngrok pour les webhooks GitHub
- Un compte GitHub et un dépôt accessible par le pipeline

Les versions utilisées lors du développement sont notamment Kubernetes `v1.35.1`, Minikube `v1.38.1` et kubectl `v1.36.0`.

## 8. Vérification de l'environnement

Démarrer Minikube :

```bash
minikube start --driver=docker
```

Vérifier le cluster :

```bash
minikube status
kubectl get nodes
```

Vérifier les composants Tekton :

```bash
kubectl get pods -n tekton-pipelines
```

Vérifier les ressources de la plateforme :

```bash
kubectl get pipelines,tasks,pipelineruns -n cicd-platform
```

## 9. Déploiement des ressources

Les commandes suivantes supposent que Minikube, Tekton Pipelines et Tekton Triggers sont déjà installés.

Créer le namespace s'il n'existe pas :

```bash
kubectl create namespace cicd-platform \
  --dry-run=client -o yaml | kubectl apply -f -
```

Appliquer les ressources nécessaires :

```bash
kubectl apply -f kubernetes/tekton-deploy-rbac.yaml
kubectl apply -f pipelines/source-pvc.yaml

kubectl apply -f pipelines/tasks/clone-repo.yaml
kubectl apply -f pipelines/tasks/test-source.yaml
kubectl apply -f pipelines/tasks/build-image.yaml
kubectl apply -f pipelines/tasks/deploy-app.yaml

kubectl apply -f pipelines/pipeline-real.yaml

kubectl apply -f pipelines/trigger-rbac.yaml
kubectl apply -f pipelines/trigger-listener-read-rbac.yaml
kubectl apply -f pipelines/trigger-binding.yaml
kubectl apply -f pipelines/trigger-template.yaml
kubectl apply -f pipelines/event-listener.yaml
```

**Remarque :** cette procédure suppose que le registre Minikube est activé et accessible avec l'adresse configurée dans le pipeline. Les ressources de l'application et le PVC doivent également être adaptés si l'environnement diffère.

## 10. Exécution manuelle du pipeline

Pour déclencher une exécution manuelle :

```bash
kubectl create -f pipelines/pipeline-real-run-deploy.yaml
```

Consulter les exécutions :

```bash
kubectl get pipelineruns -n cicd-platform
```

Suivre l'état du déploiement :

```bash
kubectl rollout status deployment/demo-app \
  -n cicd-platform
```

## 11. Vérification de l'application

Le service de démonstration utilise un service Kubernetes de type NodePort, configuré sur le port `30080`.

Récupérer l'adresse du cluster :

```bash
minikube ip
```

Tester l'application en remplaçant `<MINIKUBE_IP>` par l'adresse retournée :

```bash
curl http://<MINIKUBE_IP>:30080/
```

Réponse attendue :

```json
{
  "message": "CI/CD SaaS fonctionne !",
  "version": "1.0.0",
  "environment": "kubernetes"
}
```

Vérifier l'état de santé :

```bash
curl http://<MINIKUBE_IP>:30080/health
```

Réponse attendue :

```json
{
  "status": "UP"
}
```

## 12. Sécurité et limites actuelles

Ce projet est un prototype local. Plusieurs améliorations sont nécessaires avant une utilisation en production :

- Configurer une authentification et une validation cryptographique des webhooks GitHub.
- Gérer les secrets avec un mécanisme dédié.
- Éviter les privilèges excessifs dans les tâches de construction des images.
- Configurer un registre d'images adapté à un environnement partagé ou distant.
- Remplacer les adresses spécifiques à Minikube par une configuration paramétrable.
- Ajouter des politiques de sécurité et des limites de ressources.
- Mettre en place une isolation renforcée si plusieurs utilisateurs ou équipes utilisent la plateforme.
- Rendre les paramètres du dépôt, de la branche et de l'image configurables.

La gestion complète des utilisateurs, la séparation multi-tenant et une interface SaaS ne sont pas encore documentées comme des fonctionnalités implémentées dans ce prototype.

## 13. Résultats obtenus

Les tests réalisés ont permis de valider :

- Le clonage du dépôt GitHub.
- L'exécution des tests de l'application.
- La construction et la publication de l'image conteneur.
- Le déploiement de l'application sur Kubernetes.
- Le déclenchement d'un pipeline à partir d'un événement GitHub.
- L'accès à l'application et à son endpoint de santé.

Le projet démontre ainsi l'intégration de Kubernetes, Tekton et GitHub pour automatiser une chaîne de livraison logicielle.

## 14. Perspectives d'évolution

Les évolutions envisagées comprennent :

- Une interface web permettant de configurer les pipelines.
- La gestion de plusieurs projets et utilisateurs.
- La personnalisation des étapes de build, de test et de déploiement.
- La configuration des dépôts et des branches depuis l'interface.
- Un système d'authentification et de gestion des autorisations.
- La centralisation des journaux et des résultats d'exécution.
- Le déploiement sur un cluster Kubernetes distant.
- La mise en place d'une véritable architecture SaaS multi-tenant.

---

**Projet :** CI/CD SaaS basé sur Kubernetes et Tekton
**Application de démonstration :** Node.js / Express
**Dépôt source :** https://github.com/rzazarias-gif/cicd-saas
