export default (config)=>`
<html>
<head> <title>test_1</title> </head>
<body>

${config.projects.map((project)=>`
    <div>
        <h2>${project.title}</h2>
        ${Object.entries(project.figures).map(([k,v ])=>`
          <img src="${v}" alt="${k}">
        `).join('')}
    </div>
`).join('')}

${/* Use env to switch between minified and unminified javascript files */ '' }
${config.env === 'prod' ? `
  <script src="dist/main.min.js"></script>
` : `
  <script type="module" src="src/main.js"></script>
`}

</body>
</html>
`;
