# Documentation Images

This directory contains images used in the G.R.I.P. documentation.

## Usage Guidelines

When adding images to the documentation:

1. Use descriptive filenames that indicate the content of the image
2. Use PNG format for screenshots and diagrams
3. Optimize images for web (compress when possible)
4. Use relative paths in documentation files:
   ```markdown
   ![Description of image](./images/filename.png)
   ```
5. Include proper alt text for all images

## Image Categories

Organize images into the following categories:

- `architecture/` - System architecture diagrams
- `ui/` - User interface screenshots
- `workflows/` - Process flow diagrams
- `components/` - Component diagrams
- `examples/` - Example usage illustrations

## Image Naming Convention

Use the following naming convention for image files:

```
<category>-<specific-description>-<version>.png
```

For example:
- `architecture-high-level-v1.png`
- `ui-dashboard-dark-mode.png`
- `workflow-project-creation.png` 