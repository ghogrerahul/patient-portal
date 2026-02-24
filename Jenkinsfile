pipeline {
  agent any
  parameters {
    booleanParam(name: 'SKIP_CI', defaultValue: false, description: 'Skip CI stages')
    booleanParam(name: 'SKIP_CD', defaultValue: false, description: 'Skip CD stages')
  }
  environment {
    AWS_REGION = 'us-east-1'
    ECR_ACCOUNT = ''
    ECR_REPO = 'patient-portal'
    IMAGE_TAG = "${env.BUILD_ID}-${env.GIT_COMMIT.substring(0,7)}"
    SONAR_HOST_URL = 'https://sonarcloud.io'
    SONAR_PROJECT_KEY = 'patient-portal'
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('CI') {
      when { expression { !params.SKIP_CI } }
      stages {
        stage('Install & Build') {
          steps {
            sh 'npm ci'
            sh 'npm run lint || true'
            sh 'npm run type-check || true'
            sh 'npm run build'
            archiveArtifacts artifacts: 'dist/**', allowEmptyArchive: true
          }
        }

        stage('SonarQube Analysis') {
          steps {
            withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
              sh '''
              npm install -g sonar-scanner
              sonar-scanner \
                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                -Dsonar.sources=src \
                -Dsonar.host.url=${SONAR_HOST_URL} \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
              '''
            }
          }
        }

        stage('Secret Scanning (Gitleaks)') {
          steps {
            sh '''
            docker run --rm -v $PWD:/src zricethezav/gitleaks:latest detect \
              -s /src \
              --report-path /src/gitleaks-report.json \
              --report-format json || true
            '''
          }
        }

        stage('SCA: Trivy Filesystem Scan') {
          steps {
            sh '''
            docker run --rm -v $PWD:/src \
              -v /var/run/docker.sock:/var/run/docker.sock \
              aquasec/trivy:latest fs /src \
              --format json \
              --output /src/trivy-fs-report.json \
              --severity HIGH,CRITICAL || true
            '''
          }
        }

        stage('Auto Commit & Push') {
          steps {
            withCredentials([usernamePassword(credentialsId: 'git-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
              sh '''
              git config user.email "jenkins@ci"
              git config user.name "Jenkins CI"
              git add . || true
              git diff --quiet || \
                (git commit -m "Automated changes from Jenkins build ${BUILD_ID}" && \
                 git push https://${GIT_USER}:${GIT_PASS}@${GIT_URL#*://} HEAD:${GIT_BRANCH})
              '''
            }
          }
        }
      }
    }

    stage('CD') {
      when {
        allOf {
          expression { !params.SKIP_CD }
          branch 'main'
        }
      }
      stages {
        stage('Build Docker Image') {
          steps { sh 'docker build -t ${ECR_REPO}:${IMAGE_TAG} .' }
        }

        stage('Scan Docker Image (Trivy)') {
          steps {
            sh '''
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
              aquasec/trivy:latest image \
              --format json \
              --output trivy-image-report.json \
              --severity HIGH,CRITICAL \
              ${ECR_REPO}:${IMAGE_TAG} || true
            '''
            archiveArtifacts artifacts: 'trivy-image-report.json', allowEmptyArchive: true
          }
        }

        stage('Push to ECR') {
          steps {
            withCredentials([usernamePassword(credentialsId: 'aws-creds', passwordVariable: 'AWS_SECRET_ACCESS_KEY', usernameVariable: 'AWS_ACCESS_KEY_ID')]) {
              sh '''
              aws configure set region ${AWS_REGION}
              ACCOUNT=${ECR_ACCOUNT}
              REPO=${ECR_REPO}
              TAG=${IMAGE_TAG}
              aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com
              docker tag ${REPO}:${TAG} ${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}:${TAG}
              docker push ${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO}:${TAG}
              '''
            }
          }
        }

        stage('Deploy (ECS / S3)') {
          steps {
            withCredentials([usernamePassword(credentialsId: 'aws-creds', passwordVariable: 'AWS_SECRET_ACCESS_KEY', usernameVariable: 'AWS_ACCESS_KEY_ID')]) {
              sh '''
              CLUSTER=${ECS_CLUSTER:-your-ecs-cluster}
              SERVICE=${ECS_SERVICE:-patient-portal}
              aws ecs update-service --cluster ${CLUSTER} --service ${SERVICE} --force-new-deployment --region ${AWS_REGION}
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '*report*.json,gitleaks-report.json', allowEmptyArchive: true
      cleanWs()
    }
    success { echo "✓ Deployed ${ECR_REPO}:${IMAGE_TAG}" }
    failure { echo '✗ Build failed' }
  }
}
