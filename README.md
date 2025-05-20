# llm-d Website Repository

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

The site may be previewed at [llm-d.github.io](https://llm-d.github.io/) before it goes live

If you spot any errors or ommisions in the site, please open an issue at [github.com/llm-d/llm-d.github.io](https://github.com/llm-d/llm-d.github.io/issues)

## BEFORE DOING A PULL REQUEST

1. Make sure you are familiar with how docusaurus builds menus and links to images
2. Make sure there are no relative links to any of the llm-d component repositories in your markdown. 
3. Fork the website repo and deploy a preview version of your proposed change for reviewers to check. This will make obvious any missed links from step 2
    



### Installation

```
$ npm install
```

### Local Development

```
$ npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

<!-- ### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch. -->
