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
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
                sh 'npm install'
                sh 'npm run build'
            }
          }
        }
        stage('linux') {
          agent {
            label 'linux'
          }
          steps {
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
                sh 'npm install'
                sh 'npm run build'
            }
          }
        }
        stage('windows') {
          agent {
            label 'windows'
          }
          steps {
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
                powershell 'npm install'
                powershell 'npm run build'
            }
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
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
              sh 'npm run test'
            }
          }
        }
        stage('linux') {
          agent {
            label 'linux'
          }
          steps {
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
              sh 'npm run test'
            }
          }
        }
        stage('windows') {
          agent {
            label 'windows'
          }
          steps {
            nodejs(nodeJSInstallationName: 'node-10.15.3') {
              powershell 'npm run test'
            }
          }
        }
      }
    }
  }
}
