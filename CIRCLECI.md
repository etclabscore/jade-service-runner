# CircleCI

## Deploying

Deploy by signing into [circleci.com](http://circleci.com/) with github. Add and set up your project via the `Add Project` button. Then find your project in the list and click "Set Up Project":

![image](https://user-images.githubusercontent.com/364566/72924194-5f3a2b80-3d05-11ea-9f4b-4116e02e649a.png)

Then click "Start Building":
![image](https://user-images.githubusercontent.com/364566/72924316-90b2f700-3d05-11ea-9531-113a6c9193bd.png)


You can then add your github token by clicking on a projects `settings` icon and going to `Environment Variables` and adding: 

### `GH_TOKEN`
`
[create a personal access token for a public github here](https://github.com/settings/tokens/new?scopes=public_repo). 

When creating the token, the minimum required scopes are:

- repo for a private repository
- public_repo for a public repository

### AWS Keys

You also need to set the following keys to deploy via cloudformation defined in this repository:

- `AWS_ACCESS_KEY_ID`
- `AWS_REGION`
- `AWS_SECRET_ACCESS_KEY`

## HOLD

Once set up properly it will be building a `workflow` that puts your `release` job `ON HOLD` until manually approved. This lets you batch up fixes and features into 1 release and still have the convenience of a 1 button deploy.

## Github Releases
On successfull release, it will create release notes and a new release and publish to github and github pages.
