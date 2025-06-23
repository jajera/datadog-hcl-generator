# 🐕 Datadog HCL Generator

A modern, static web application that converts Datadog dashboard JSON exports into clean Terraform HCL code with **configuration-driven widget mapping** for accurate, modern Terraform syntax.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://jajera.github.io/datadog-hcl-generator/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## ✨ Key Features

### 🎯 **Configuration-Driven Architecture**

- **External Configuration**: Widget mappings defined in `widget-config.json`
- **Modern Terraform Syntax**: Generates proper `widget_layout` blocks and modern request structures
- **Hybrid Query Support**: Supports both modern `query { metric_query { ... } }` and legacy `q = "query"` formats as needed
- **Formula & Conditional Formats**: Full support for advanced dashboard features including aliases and limits

### 🚀 **Core Functionality**

- **Real-time Conversion**: Instant JSON to HCL transformation
- **25+ Widget Types**: Comprehensive support including `query_table`, `timeseries`, `query_value`, and more
- **Smart Request Structure**: Automatically chooses optimal request format per widget type
- **Drag & Drop**: Simply drop your JSON file onto the interface
- **Copy to Clipboard**: One-click HCL copying with fallback support
- **Download Support**: Save generated HCL as `.tf` files

### 🔍 **Advanced Validation**

- **Multi-layered Validation**: Syntax, Terraform structure, and Datadog provider-specific checks
- **Detailed Error Reporting**: Line-by-line error identification with suggestions
- **Real-time Feedback**: Instant validation as you type
- **Best Practices**: Checks for proper formatting and structure

### 🎨 **User Experience**

- **Dark/Light Theme**: Automatic theme detection with manual toggle
- **Keyboard Shortcuts**: Power-user friendly shortcuts
- **Offline Support**: Works without internet connection
- **Mobile Responsive**: Works on all device sizes

## 🎮 Live Demo

Try it out: [https://jajera.github.io/datadog-hcl-generator/](https://jajera.github.io/datadog-hcl-generator/)

## 🚀 Quick Start

### Using the Web App

1. **Export Dashboard JSON** from Datadog:
   - Go to your Datadog dashboard
   - Click the settings gear → "Export dashboard JSON"
   - Copy the JSON content

2. **Convert to HCL**:
   - Paste JSON into the input area, or
   - Drag & drop your `.json` file
   - HCL code generates automatically

3. **Use the Output**:
   - Copy to clipboard or download as `.tf` file
   - Add to your Terraform configuration
   - Use `terraform import` to import the existing dashboard

### Local Development

```bash
# Clone the repository
git clone https://github.com/jajera/datadog-hcl-generator.git
cd datadog-hcl-generator

# Serve locally (any method works)
python3 -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000

# Open in browser
open http://localhost:8000
```

## 📖 Usage Examples

### Input (Datadog Dashboard JSON)

```json
{
  "id": "abc-123-def-456",
  "title": "Sample Application Dashboard",
  "description": "Monitoring metrics for our sample application",
  "layout_type": "ordered",
  "widgets": [
    {
      "definition": {
        "type": "timeseries",
        "title": "CPU Usage",
        "requests": [
          {
            "formulas": [
              {
                "alias": "CPU Usage",
                "formula_expression": "query1"
              }
            ],
            "queries": [
              {
                "data_source": "metrics",
                "name": "query1",
                "query": "avg:system.cpu.user{*}"
              }
            ]
          }
        ]
      },
      "layout": { "x": 0, "y": 0, "width": 12, "height": 8 }
    }
  ]
}
```

### Output (Terraform HCL)

```hcl
resource "datadog_dashboard" "sample_application_dashboard" {
  title       = "Sample Application Dashboard"
  description = "Monitoring metrics for our sample application"
  layout_type = "ordered"

  widget {
    id = "abc-123-def-456"
    widget_layout {
      height          = 8
      is_column_break = false
      width           = 12
      x               = 0
      y               = 0
    }

    timeseries_definition {
      title = "CPU Usage"
      show_legend = true
      legend_layout = "auto"

      request {
        display_type   = "line"
        on_right_yaxis = false

        formula {
          alias              = "CPU Usage"
          formula_expression = "query1"
        }

        query {
          metric_query {
            data_source = "metrics"
            name        = "query1"
            query       = "avg:system.cpu.user{*}"
          }
        }
      }
    }
  }
}
```

### Terraform Import Workflow

```bash
# 1. Add the generated HCL to your .tf file
# 2. Import the existing dashboard using the dashboard ID
terraform import datadog_dashboard.sample_application_dashboard abc-123-def-456

# 3. Plan to see any differences
terraform plan

# 4. Apply if needed (usually just formatting changes)
terraform apply
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Clear input |
| `Ctrl+Enter` | Process input |
| `Ctrl+Shift+Enter` | Copy output |
| `Ctrl+L` | Load sample dashboard |
| `Ctrl+V` | Validate HCL |
| `Ctrl+Shift+F` | Focus input field |
| `Ctrl+T` | Toggle theme |
| `Esc` | Close validation panel |

## 🏗️ Architecture

```plaintext
datadog-hcl-generator/
├── index.html              # Main HTML structure
├── style.css               # Comprehensive styling with themes
├── script.js               # Core application logic (2,900+ lines)
├── widget-config.json      # 🆕 Widget configuration mappings
├── sample-dashboard.json   # Example dashboard for testing
├── manifest.json           # PWA manifest
├── favicon.svg            # Application icon
├── robots.txt             # SEO configuration
├── sitemap.xml            # Site structure
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions deployment
```

### Key Components

- **DatadogHCLGenerator Class**: Main application logic with widget-specific generation
- **Configuration System**: External JSON configuration for widget mappings
- **Theme System**: CSS variables with localStorage persistence
- **File Handling**: Drag & drop and file input support
- **Smart HCL Generation**: Context-aware modern vs legacy request structure selection
- **Validation Engine**: Multi-layer validation with detailed error reporting

## 🎯 Widget Support

### Fully Supported Widgets

| Widget Type | Request Structure | Features |
|-------------|------------------|----------|
| `timeseries` | Modern | Formulas, aliases, multiple queries |
| `query_value` | Modern | Conditional formats, formulas, timeseries background |
| `query_table` | Modern | Conditional formats, formulas, limits |
| `toplist` | Legacy | Conditional formats, simple queries |
| `group` | N/A | Nested widgets, layout management |
| `note` | N/A | Rich text content |

### Advanced Features

- **Formula Support**: Complex expressions with aliases
- **Conditional Formats**: Color coding and value hiding
- **Multiple Queries**: Support for multiple data sources per widget
- **Layout Management**: Proper widget positioning and sizing

## 🚀 Deployment

### GitHub Pages (Recommended)

1. **Fork or clone** this repository
2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
3. **Access your app** at: `https://username.github.io/repository-name/`

### Other Static Hosting

This app works on any static hosting service:

- **Netlify**: Drag & drop the folder to Netlify
- **Vercel**: Connect your GitHub repo
- **Firebase Hosting**: `firebase deploy`
- **AWS S3**: Upload files to S3 bucket with static hosting
- **Cloudflare Pages**: Connect GitHub repository

## 🛠️ Development

### File Structure

- **No build process required** - pure HTML/CSS/JS
- **No external dependencies** - works offline
- **Modern browser support** - ES6+ features used
- **Configuration-driven** - easy to extend and modify

### Adding New Widget Types

Add new widgets by updating `widget-config.json`:

```json
{
  "widgets": {
    "your_new_widget": {
      "blockName": "your_new_widget_definition",
      "commonProperties": ["title", "title_size", "title_align"],
      "specificProperties": {
        "custom_property": "custom_property"
      },
      "requestStructure": "modern",
      "features": {
        "supportsFormulas": true,
        "supportsConditionalFormats": true
      }
    }
  }
}
```

### Customizing Request Structures

The tool automatically selects the best request structure:

- **Modern**: `query { metric_query { ... } }` with formula support
- **Legacy**: `q = "query string"` for simple metrics

### Extending Validation

Add custom validation rules in the `validateHCL()` method:

```javascript
// Add new validation in script.js
validateCustomRules(hclContent, issues) {
    // Your custom validation logic
    if (someCondition) {
        issues.push({
            severity: 'warning',
            title: 'Custom Rule',
            description: 'Description of the issue',
            location: 'Line X'
        });
    }
}
```

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- 🎯 **Widget Support**: Add more widget-specific configurations
- 📊 **Monitor Support**: Extend to handle Datadog monitors
- 🔍 **SLO Support**: Add Service Level Objectives conversion
- 🧪 **Synthetics**: Support synthetic test conversions
- 🎨 **UI Improvements**: Better error handling, animations
- 📚 **Documentation**: More examples and use cases

### Development Setup

```bash
git clone https://github.com/jajera/datadog-hcl-generator.git
cd datadog-hcl-generator

# Make changes to HTML, CSS, or JS files
# Test locally with any static server
python3 -m http.server 8000

# Submit a pull request
```

## 📋 Roadmap

- [x] **Configuration-driven widget mapping**
- [x] **Modern and legacy request structure support**
- [x] **Advanced formula and conditional format support**
- [x] **Comprehensive validation system**
- [ ] **Multi-resource support** (monitors, SLOs, synthetics)
- [ ] **Batch conversion** for multiple dashboards
- [ ] **Export to ZIP** for multiple files
- [ ] **Template system** for custom HCL patterns

## ❓ FAQ

**Q: Does this work with all Datadog dashboard features?**
A: The tool supports 25+ widget types with modern Terraform syntax. Complex custom widgets may need manual adjustment.

**Q: Is my data sent to any servers?**
A: No! All processing happens in your browser. Your dashboard data never leaves your machine.

**Q: Can I use this offline?**
A: Yes! Once loaded, the app works completely offline.

**Q: What Terraform provider version is supported?**
A: Generated HCL is compatible with the latest DataDog Terraform provider (v3.x).

**Q: Why doesn't the tool generate import blocks?**
A: Import blocks are not needed for the generated resource code. You can manually run `terraform import` with your dashboard ID.

## 🔍 Validation Features

The tool includes comprehensive HCL validation:

### Built-in Validation

- **Syntax Validation**: Balanced braces, proper quoting, valid identifiers
- **Terraform Structure**: Resource blocks, naming conventions, duplicates
- **Datadog Provider**: Required fields, valid types, metric queries
- **Best Practices**: Formatting, line length, variable usage

### External Validation

For the most reliable validation, use Terraform CLI:

```bash
# Save generated HCL to a .tf file
terraform init
terraform validate
terraform fmt -check
terraform plan  # With valid credentials
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Datadog](https://www.datadoghq.com/) for their excellent monitoring platform
- [Terraform](https://www.terraform.io/) for Infrastructure as Code
- [DataDog Terraform Provider](https://registry.terraform.io/providers/DataDog/datadog/latest) maintainers

---

Made with ❤️ for the DevOps community

[Report Issues](https://github.com/jajera/datadog-hcl-generator/issues) | [Feature Requests](https://github.com/jajera/datadog-hcl-generator/issues) | [Contribute](https://github.com/jajera/datadog-hcl-generator/pulls)
