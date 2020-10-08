# Rocket-PlusPlus

This is the porting or hubot-plusplus into RocketChat using hubot-rocketchat-boilerplate
## Quick Start

```
git clone https://github.com/gi4nks/rocket-plusplus
cd rocket-plusplus
npm install
```
Create a _.env_ file with content:

```
export ROCKETCHAT_URL=myserver.com
export ROCKETCHAT_USER=mybotuser
export ROCKETCHAT_PASSWORD=mypassword
export ROCKETCHAT_ROOM=general
export ROCKETCHAT_USE_SSL=true
```

Adjust the content to fit your server and user credentials. Make sure `myuser` has **BOT role** on the server, if you don't know what that means, ask your server administrator to set it up for you.

Then run the bot:

```
source .env
bin/hubot
```

On the server, login as a regular user (not the BOT user), go to GENERAL, and try:

```
<name>++ [<reason>] - Increment score for a name (for a reason)
<name>-- [<reason>] - Decrement score for a name (for a reason)
hubot score <name> - Display the score for a name and some of the reasons
hubot top <amount> - Display the top scoring <amount>
hubot bottom <amount> - Display the bottom scoring <amount>
hubot erase <name> [<reason>] - Remove the score for a name (for a reason)

```

OR

```
mybotuser rc version
```
`< TBD:  insert sample run screenshot >`

### Running Locally

You can run with the shell adapter just to test

1. Run `yarn` or `npm install` to install dependencies
2. Use the `yarn shell` script to start the bot with shell adaptor
3. Say `hubot help` to see what it can do

When you're ready to connect the bot to an instance of Rocket.Chat

1. Create a user for the bot, with the role _bot_
2. Create an `./.env` file with the user and connection settings
3. Run `yarn local` script to connect to your local Rocket.Chat

The `local` npm script will read in the env file, so you can populate and modify
those settings easily (see [configuration](#configuration)). In production, they
should be pre-populated in the server environment.

### Running in Production

There are executables for different environments that all run the Hubot binary.

Before running make sure your production environment has the required 
environment variables for the adapter, url, user, name and pass. Or you can add
them after the launch command as switches, like `-a rocketchat`.

- `bin/hubot` unix binary
- `bin/hubot.cmd` in windows
- `Procfile` for Heroku

Env variables should be populated on the server before launching
(see [configuration](#configuration)). The launcher will also install npm
dependencies on every run, in case it's booting in a fresh container (this isn't
required when working locally).

More information on [deployment configs][deployment] here.

### Adding Scripts

Scripts can be added to the `./scripts` folder, or by installing node packages
and listing their names in the `external-scripts.json` array. There's an example
of each in this repo, but neither is required.

## Configuration

When running locally, we've used [`dotenv`][dotenv] to load configs from the
`./.env` file. That makes it easy for setting environment variables.
