![templateliterals_logo](https://user-images.githubusercontent.com/10873576/158666335-f32cc705-91a6-4008-bf30-ce754cf6f543.png)

# template-literals-cli

> Newly updated for Node 22+ and 2025! Still so literal, a barbarian can do it!

Provides a simple way to build [ES6 Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) into static html files with an optional yaml or json config/data file. Perfect for static frontends, doc sites, or any other project where adding another language or framework feels like overkill. Almost no dependencies!


## Getting started
1. Install via `npm install template-literals-cli -g`

2. Create a config/data file using either YAML or json. For example `mydata.yml`:
```yaml
fire_hot: true
exclamations: 
  - 'UYGH!'
  - 'GRRAH!'
  - 'OOAH!' 
colors:
  - 'red'
  - 'orange'
  - 'yellow'
```

3. Create a template file which exports a default function. For example `touchfire.js`:
```js
export default (config)=>`
<html>
    <body>
        <h1>${ config['fire_hot'] ? config['exclamations'][Math.floor(Math.random() * config['exclamations'].length)] : 'Wha'}</h1>
        
        <h3>${ config['exclamations'].join(' ') }</h3>
        
        <div>
            ${ config['fire_hot'] ? config['exclamations'].map((exclamation, index)=>`
                <span style="color: ${config.colors[index]}; padding: 1rem;">${exclamation}</span>
            `).join(''):'' }
        </div>
    </body>
</html>
`
```

3. Build the file into `dist/touchfire.html` using `template-literals --config config.yml --outdir dist touchfire.js`

4. (optional) Start the http server of your choice in `dist/` and visit `http://localhost/touchfire.html`. Optionally you can build again using `template-literals --config config.yml --outdir dist --indexes touchfire.js` and then visit `http://localhost/touchfire/` if you want a prettier url.

5. (optional) Add the npm script below to your project's `package.json` so can just run `npm run build` instead of remembering your exact build command:
```json
{
"scripts": {
    "build": "template-literals --config config.yml --outdir dist --indexes src/*.js"
    }
}
``` 
Note that the wildcard is expanded by your terminal and therefore may not work on Windows/wherever glob is not available.

## Importing other templates
Using templates from other files is easy, just import the desired template like this:
```js
// File: templates/header.js
export default (config)=>`
<nav class="menu">
  <ul>
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>
`
// end file

// File: index.js
import header from 'templates/header';
export default (config)=>`
<html>
    <body>
        ${ header(config) }
        
        <!-- more content here -->
    </body>
</html>
`
// endfile
```

## Complex logic
If your templates start to get complicated you can always fall back to javascript to handle complex bits - so long as the default export returns a string.
```js
import item_card from 'templates/item_card.js';
export default (config)=> {
  let x = 0;
  let cards = config['items'].map((item)=>{
    return item_card(item, x++);
  });
  return `
     <html>
         <body>
             ${ cards.join('') }
             
             <!-- more content here -->
         </body>
     </html>
  `
}
```

## Injecting environment variables
Occasionally, it's helpful to inject variables at build-time. As of 1.0.0, any key=value pairs after `--` will be processed as additional config properties and can even override existing values in the config file.

```js
//myPage.js
export default ({env="prod"})=>`
<html>
<head> ... </head>
<body>

...

${/* Use env to switch between minified and unminified javascript files */ '' }
${env === 'prod' ? `
  <script src="dist/main.min.js"></script>
` : `
  <script type="module" src="main.js"></script>
`}

</body>
</html>
`;

```

`template-literals --config "config.yml" --outdir ./ ./src/myPage.js -- env=dev`

### A big stick 
These overrides have a couple of super powers. Take the following config:

```json5
{
  "projects": [
    {
      "title": "My Project",
      "figures": {
        "sales_6mo": "/images/sales.png",
        "sales_3mo": "/images/sales2.png"
      }
    },
    // ...
  ],
  // ...
}
```

Now imagine you need to override the project title. By specifying a key with **dot-notation** you can change properties deep in your config:

`template-literals --config "config.yml" --outdir ./ ./src/myPage.js -- projects.0.title="The Best Project"`

And to take things a step further, you can completely override `projects.0.figures` with a new object by passing **JSON as a value**:

`template-literals --config "config.yml" --outdir ./ ./src/myPage.js -- projects.0.title="The Best Project" projects.0.figures='{"sales_1mo":"/images/sales_1mo.png","sales_3mo":"/images/sales_3mo.png"}'`

Final result:
```json5
{
  "projects": [
    {
      "title": "My Best Project",
      "figures": {
        "sales_1mo":"/images/sales_1mo.png",
        "sales_3mo":"/images/sales_3mo.png",
      }
    },
    // ...
  ],
  // ...
}
```

## CLI options

```
Usage: template-literals [options] <entry-files...>

Options:
  -V, --version            output the version number
  -h, --help               display help for command

  -c, --config <file>      Path to the config file (default: "config.yml")
  -o, --outdir <dir>       Output directory (default: "dist")
  -i, --indexes             Generate index files for pretty URLs
  -v, --verbose           Display verbose logging information
  -q, --quiet             Suppress all output except errors (useful for CI)
```

## Watch mode

To keep things simple, template-literals-cli does not have a built-in watch mode. Instead, you can use a tool like fswatch to automatically rebuild your site when your templates or config files change.

**Install fswatch:**

Ubuntu: `sudo apt install fswatch`

macOS: `brew install fswatch`

Example usage:

```bash
fswatch -o src/*.js config.yml | xargs -n1 -I{} template-literals --config config.yml --outdir dist src/*.js
```


## API usage

You can also use this library programmatically:

```js
import { generateHtmlFromTemplates } from './template-literals.mjs';

const inputFiles = ['src/page_1.mjs'];
const outdir = 'dist';
const config = {
  fire_hot: true,
  exclamations: ['Wow', 'Hot', 'Fire!'],
  colors: ['red', 'orange', 'yellow']
};

const generated = await generateHtmlFromTemplates({
  inputFiles,
  outdir,
  config,
  indexes: false, // or true for pretty URLs
  verbose: true
});

console.log('Generated files:', generated);
```
