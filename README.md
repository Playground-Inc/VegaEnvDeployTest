# Vega Env Deploy Test

## Usage

### Deployment

In order to deploy a new environment based on a stage, you need to :

- Create a file named "STAGE.yml" at the root of the project with as content same like below:

```
STAGE: ben-new-feature
```
Do not use "/" inside

- Then run the following command:

```
$ sls deploy
```

- Add the domains you want on Vercel:

```
dev-ben-new-feature.bidi.boo
```
Assigned to the corresponding branch: ben/new-feature

After deployment, these urls will be available:
- dev-ben-new-feature.bidi.boo (Vercel)
- dev-ben-new-feature-api.bidi.boo (Cloudfront distribution)
etc.

TODO: Playground URL and all domains
TODO: product stage --prod from non main branch
TODO: automatize vercel domain creation?

