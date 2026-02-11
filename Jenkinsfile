pipeline {
  agent any
  environment {
    AWS_REGION = 'us-east-1'
    ECR_SNAPSHOT = '147997138755.dkr.ecr.us-east-1.amazonaws.com/snapshot/patientportal'
    ECR_RELEASE = '147997138755.dkr.ecr.us-east-1.amazonaws.com/patientportal'
    IMAGE_NAME = 'patientportal'
  }
  stages {
    stage('Checkout & Install') {
      steps {
        checkout scm
        sh 'rm -rf node_modules'
        sh 'export NODE_ENV=development && npm install'
      }
    }
    stage('Quality Checks') {
      parallel {
        stage('Lint') {
          steps {
            sh 'npm run lint'
          }
        }
        stage('UnitTest') {
          steps {
            sh 'npm run test:coverage'
          }
        }
      }
    }
    stage('SonarQube') {
      steps {
        withCredentials([string(credentialsId: 'SONAR_TOKEN_PORTAL', variable: 'SONAR_TOKEN')]) {
          sh '''
            export PATH=$PATH:/opt/sonar-scanner/bin
            sonar-scanner \
              -Dsonar.host.url=http://100.50.131.6:9000 \
              -Dsonar.login=$SONAR_TOKEN
          '''
        }
      }
    }
    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
    stage('Docker Build & Trivy Scan') {
      steps {
        script {
          dockerImage = docker.build("${ECR_SNAPSHOT}:${env.BUILD_NUMBER}")
        }
        sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} || true"
      }
    }
    stage('Push to ECR Snapshot') {
      steps {
        script {
          withCredentials([aws(credentialsId: 'AWS Credentials')]) {
            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin 147997138755.dkr.ecr.us-east-1.amazonaws.com"
            sh "docker push ${ECR_SNAPSHOT}:${env.BUILD_NUMBER}"
          }
        }
      }
    }
    stage('Push to Release') {
      steps {
        script {
          withCredentials([aws(credentialsId: 'AWS Credentials')]) {
            sh "docker tag ${ECR_SNAPSHOT}:${env.BUILD_NUMBER} ${ECR_RELEASE}:release-${env.BUILD_NUMBER}"
            sh "docker push ${ECR_RELEASE}:release-${env.BUILD_NUMBER}"
          }
        }
      }
    }
  }
  post {
    always { cleanWs() }
  }
}
