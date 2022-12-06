# Vega Env Deploy Test

## Usage

### Deployment

In order to deploy a new environment based on a stage:

```
npm run init
```

- Then run the following command:

```
$ sls deploy
```

- Add the domain(s) you want on Vercel:

```
dev-ben-new-feat.dev.bidi.boo
```

Assign on Vercel the corresponding branch: ben/new-feat

After deployment, these urls will be available:

- dev-ben-new-feat.dev.bidi.boo (Vercel)
- dev-ben-new-feat-api.dev.bidi.boo (Cloudfront distribution)
  etc.

And common Playground URLs:

- ben-new-feat-auth.dev.playgrnd.media
- ben-new-feat-assets.dev.playgrnd.media
- ben-new-feat-api.dev.playgrnd.media

TODO: automatize vercel domains creation?
