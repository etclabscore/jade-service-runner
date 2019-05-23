pipeline {
  agent none
  stages {
    stage('Build') {
      parallel {
        stage('macos') {
          agent {
            label 'macos'
          }
          steps {
            sh 'npm install'
            sh 'npm run build'
          }
        }
        stage('linux') {
          agent {
            label 'linux'
          }
          steps {
            sh 'npm install'
            sh 'npm run build'
          }
        }
        stage('windows') {
          agent {
            label 'windows'
          }
          steps {
            powershell 'npm install'
            powershell 'npm run build'
          }
        }
      }
    }
    stage('Run Tests') {
      parallel {
        stage('macosx') {
          agent {
            label 'macosx'
          }
          steps {
            sh 'npm run test'
          }
        }
        stage('linux') {
          agent {
            label 'linux'
          }
          steps {
            sh 'npm run test'
          }
        }
        stage('windows') {
          agent {
            label 'windows'
          }
          steps {
            powershell 'npm run test'
          }
        }
      }
    }
  }
}
