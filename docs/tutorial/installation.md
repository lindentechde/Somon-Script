# Installation

This guide will help you install SomonScript and set up your development
environment.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Usually comes with Node.js
- **Operating System**: Windows, macOS, or Linux

## Installation Methods

### Quick Install (Recommended)

Install SomonScript globally using npm:

```bash
npm install -g somon-script
```

### Verify Installation

Check that SomonScript is installed correctly:

```bash
somon --version
```

You should see output similar to:

```
0.2.14
```

## Create Your First Project

### Initialize a New Project

```bash
somon init my-first-project
cd my-first-project
npm install
```

This creates a new directory with:

- `src/main.som` - Your main SomonScript file
- `package.json` - Project configuration
- `tsconfig.json` - TypeScript configuration for JavaScript output

### Project Structure

```
my-first-project/
├── src/
│   └── main.som          # Your SomonScript source files
├── dist/                 # Compiled JavaScript output
├── package.json          # Project configuration
└── tsconfig.json         # Compilation settings
```

## Development Environment Setup

### VS Code (Recommended)

While a dedicated SomonScript extension is in development, you can use VS Code
with these settings:

1. Install the "Better Comments" extension for syntax highlighting
2. Associate `.som` files with TypeScript for basic syntax support

### Alternative Editors

SomonScript files (`.som`) are plain text files that can be edited with any text
editor:

- **Sublime Text**: Use TypeScript syntax highlighting
- **Vim/Neovim**: Use TypeScript syntax
- **IntelliJ IDEA**: Use TypeScript file association

## Next Steps

Now that you have SomonScript installed:

1. **[Write your first program](first-program.md)** - Create a simple "Hello,
   World!" program
2. **[Learn basic syntax](basic-syntax.md)** - Understand SomonScript
   fundamentals
3. **[Explore examples](../../examples/)** - Look at real code samples

## Troubleshooting

### Common Issues

**Error: `somon: command not found`**

- Make sure you installed globally with `-g` flag
- Check that npm global packages are in your PATH

**Error: `npm EACCES: permission denied`**

- On macOS/Linux, you may need to use `sudo npm install -g somon-script`
- Or configure npm to use a different directory

**Node.js version too old**

- Update Node.js to version 16 or higher
- Use a Node.js version manager like `nvm` for easy switching

### Getting Help

- [Common problems and solutions](../how-to/handle-compilation-errors.md)
- [Submit an issue](https://github.com/Slashmsu/somoni-script/issues)
- [Community discussions](https://github.com/Slashmsu/somoni-script/discussions)

## Alternative Installation Methods

### From Source

For development or to get the latest features:

```bash
git clone https://github.com/Slashmsu/somoni-script.git
cd somoni-script
npm install
npm run build
npm link
```

### Using npx (No Installation)

Try SomonScript without installing:

```bash
npx somon-script --version
npx somon-script run my-file.som
```

---

**Ready to write code?** → [Your First Program](first-program.md)
