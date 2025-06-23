/**
 * Datadog HCL Generator - JavaScript
 * Converts Datadog dashboard JSON to Terraform HCL
 * Version: 1.0.0 - Configuration-driven with modern Terraform syntax
 *
 * Features:
 * - Modern widget_layout blocks instead of layout objects
 * - Query blocks with metric_query/log_query structures
 * - Formula and conditional_formats support
 * - Configuration-driven widget mapping system
 * - Comprehensive validation with detailed error reporting
 * - Support for 20+ widget types with proper HCL generation
 */

class DatadogHCLGenerator {
    constructor() {
        this.version = '1.0.0';
        console.log('🚀 DatadogHCLGenerator v' + this.version + ' initializing...');

        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();

        // Initialize widget mappings asynchronously
        console.log('📋 Loading widget configuration...');
        this.configurationLoaded = this.initializeWidgetMappings();

        // Initialize validation after configuration is loaded
        this.configurationLoaded.then(() => {
            console.log('✅ Configuration loaded successfully');
            this.initializeValidation();
        }).catch(error => {
            console.error('❌ Configuration initialization failed:', error);
            // Still initialize validation with fallback config
            this.initializeValidation();
        });

        this.handleURLParameters();
    }

    initializeElements() {
        // Input elements
        this.jsonInput = document.getElementById('json-input');
        this.fileInput = document.getElementById('file-input');
        this.dropZone = document.getElementById('drop-zone');
        this.clearInputBtn = document.getElementById('clear-input');
        this.inputError = document.getElementById('input-error');

        // Output elements
        this.hclOutput = document.getElementById('hcl-output');
        this.copyBtn = document.getElementById('copy-output');
        this.downloadBtn = document.getElementById('download-output');
        this.outputSuccess = document.getElementById('output-success');

        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');

        // Validation elements (will be created dynamically)
        this.validationPanel = null;
        this.validateBtn = null;
    }

    initializeEventListeners() {
        // Input events
        this.jsonInput.addEventListener('input', this.handleInputChange.bind(this));
        this.jsonInput.addEventListener('paste', this.handleInputChange.bind(this));
        this.clearInputBtn.addEventListener('click', this.clearInput.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Drag and drop events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // Output events
        this.copyBtn.addEventListener('click', this.copyToClipboard.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadFile.bind(this));

        // Theme toggle
        this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
    }

    initializeTheme() {
        // Check for saved theme first, then system preference, then default to light
        let theme = localStorage.getItem('datadog-hcl-theme');

        if (!theme) {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
        }

        this.setTheme(theme);
    }

    handleURLParameters() {
        const params = new URLSearchParams(window.location.search);

        // Handle action parameter
        if (params.get('action') === 'clear') {
            this.clearInput();
        }

        // Handle sample parameter
        if (params.get('sample') === 'true') {
            this.loadSampleData();
        }
    }

    async loadSampleData() {
        try {
            // Ensure configuration is loaded first
            await this.configurationLoaded;

            const response = await fetch('sample-dashboard.json');
            if (!response.ok) {
                throw new Error(`Failed to load sample data: ${response.status}`);
            }

            const sampleData = await response.json();
            this.jsonInput.value = JSON.stringify(sampleData, null, 2);
            this.handleInputChange();
            this.displaySuccess('📊 Sample dashboard loaded successfully!');
        } catch (error) {
            console.error('Failed to load sample data:', error);
            this.displayError('❌ Failed to load sample dashboard. Please check your connection.');
        }
    }

    handleInputChange() {
        // Clear any existing validation results when input changes
        this.clearValidationResults();

        // Debounce input changes to avoid excessive processing
        clearTimeout(this.inputTimeout);
        this.inputTimeout = setTimeout(() => {
            this.processInput();
        }, 500);
    }

    clearValidationResults() {
        if (this.validationPanel) {
            this.validationPanel.style.display = 'none';
            // Also clear the content to ensure no stale data
            const summaryElement = this.validationPanel.querySelector('.validation-summary');
            const detailsElement = this.validationPanel.querySelector('.validation-details');
            if (summaryElement) {
                summaryElement.textContent = '';
                summaryElement.className = 'validation-summary';
            }
            if (detailsElement) {
                detailsElement.innerHTML = '';
            }
        }
    }

    async processInput() {
        const input = this.jsonInput.value.trim();

        if (!input) {
            this.clearOutput();
            this.disableOutputButtons();
            return;
        }

        try {
            // Ensure configuration is loaded before processing
            if (this.configurationLoaded) {
                await this.configurationLoaded;
            }

            // Clear previous messages
            this.clearMessages();

            // Parse JSON input
            const dashboardData = JSON.parse(input);

            // Validate the dashboard data structure
            this.validateDashboardData(dashboardData);

            // Check if widget mappings are available
            if (!this.widgetMappings) {
                console.warn('Widget mappings not loaded, using fallback configuration');
                this.displayError('⚠️ Widget configuration not fully loaded. Output may be incomplete.');
            }

            // Generate HCL output
            const hcl = this.generateHCL(dashboardData);

            // Display the result
            this.displayOutput(hcl);
            this.enableOutputButtons();
            this.displaySuccess('✅ Dashboard converted successfully!');

            // Track successful conversion
            this.trackConversion('success');

        } catch (error) {
            console.error('Processing error:', error);

            // Display detailed error message
            const errorMessage = this.getDetailedErrorMessage(error);
            this.displayError(errorMessage);
            this.clearOutput();
            this.disableOutputButtons();

            // Track failed conversion
            this.trackConversion('error', error.message);
        }
    }

    validateDashboardData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON: Expected an object');
        }

        if (!data.title && !data.id) {
            throw new Error('Dashboard must have either a title or id field');
        }

        // Warn about missing common fields
        const warnings = [];
        if (!data.id) warnings.push('Missing dashboard ID - using placeholder');
        if (!data.title) warnings.push('Missing title - using default');
        if (!data.layout_type) warnings.push('Missing layout_type - using "ordered"');

        if (warnings.length > 0) {
            console.warn('Dashboard validation warnings:', warnings);
        }
    }

    getDetailedErrorMessage(error) {
        if (error instanceof SyntaxError) {
            const match = error.message.match(/position (\d+)/);
            if (match) {
                const position = parseInt(match[1]);
                const lines = this.jsonInput.value.substring(0, position).split('\n');
                const line = lines.length;
                const column = lines[lines.length - 1].length + 1;
                return `Invalid JSON at line ${line}, column ${column}: ${error.message}`;
            }
            return `Invalid JSON: ${error.message}`;
        }
        return `Error: ${error.message}`;
    }

    generateHCL(dashboardData) {
        // Extract basic dashboard properties
        const title = this.escapeHCLString(dashboardData.title || 'Imported Dashboard');
        const description = dashboardData.description ? this.escapeHCLString(dashboardData.description) : null;
        const layoutType = dashboardData.layout_type || 'ordered';
        const dashboardId = dashboardData.id || 'DASHBOARD_ID_PLACEHOLDER';

        // Generate resource name from title - use lowercase convention to match original
        const resourceName = this.generateResourceName(dashboardData.title || 'imported_dashboard', false);

        // Start building HCL
        let hcl = `resource "datadog_dashboard" "${resourceName}" {\n`;
        hcl += `  title       = ${title}\n`;

        // Always include description (even if empty) to match original
        if (description !== null) {
            hcl += `  description = ${description}\n`;
        } else if (dashboardData.hasOwnProperty('description')) {
            hcl += `  description = ""\n`;
        }

        // Add reflow_type if present (comes before layout_type in original)
        if (dashboardData.reflow_type) {
            hcl += `  reflow_type = "${dashboardData.reflow_type}"\n`;
        }

        hcl += `  layout_type = "${layoutType}"\n`;

        // Always include notify_list to match original structure
        if (dashboardData.notify_list && dashboardData.notify_list.length > 0) {
            hcl += `  notify_list = ${JSON.stringify(dashboardData.notify_list)}\n`;
        } else if (dashboardData.hasOwnProperty('notify_list')) {
            hcl += `  notify_list = []\n`;
        }

        // Add basic properties
        if (dashboardData.is_read_only !== undefined) {
            hcl += `  is_read_only = ${dashboardData.is_read_only}\n`;
        }

        // Add URL if available
        if (dashboardData.url) {
            hcl += `  url = "${dashboardData.url}"\n`;
        }

        // Add tags if available
        if (dashboardData.tags && dashboardData.tags.length > 0) {
            hcl += `  tags = ${JSON.stringify(dashboardData.tags)}\n`;
        }

        // Add template variables if available
        if (dashboardData.template_variables && dashboardData.template_variables.length > 0) {
            hcl += `\n`;
            dashboardData.template_variables.forEach((variable, index) => {
                hcl += `  template_variable {\n`;

                // Always include available_values to match original structure
                if (variable.available_values && Array.isArray(variable.available_values)) {
                    hcl += `    available_values = ${JSON.stringify(variable.available_values)}\n`;
                } else {
                    hcl += `    available_values = []\n`;
                }

                // Handle defaults properly - preserve original behavior
                if (variable.default !== undefined) {
                    // Handle both single values and arrays
                    const defaultValue = Array.isArray(variable.default) ? variable.default : [variable.default];
                    hcl += `    defaults         = ${JSON.stringify(defaultValue)}\n`;
                } else if (variable.defaults !== undefined) {
                    hcl += `    defaults         = ${JSON.stringify(variable.defaults)}\n`;
                } else {
                    // Default to empty array to match original structure
                    hcl += `    defaults         = []\n`;
                }

                hcl += `    name             = "${variable.name}"\n`;
                if (variable.prefix) hcl += `    prefix           = "${variable.prefix}"\n`;

                hcl += `  }\n`;
            });
        }

        // Add widgets (enhanced with better support)
        if (dashboardData.widgets && dashboardData.widgets.length > 0) {
            hcl += `\n  # long queue\n\n`;

            dashboardData.widgets.forEach((widget, index) => {
                hcl += this.generateWidgetHCL(widget, index);
            });
        } else {
            hcl += `\n  # No widgets found - add your widget configurations here\n`;
        }

        hcl += `}\n`;

        return hcl;
    }

    generateWidgetHCL(widget, index) {
        const widgetType = widget.definition?.type || 'unknown';
        const definition = widget.definition || {};

        // Use configuration-driven approach for modern syntax
        return this.generateModernWidgetHCL(widget, widgetType, definition);
    }

    generateModernWidgetHCL(widget, widgetType, definition) {
        let hcl = `\n  widget {\n`;

        // Add widget ID if available
        if (widget.id) {
            hcl += `    id = "${widget.id}"\n`;
        }

        // Generate widget_layout block (modern syntax)
        if (widget.layout) {
            hcl += `    widget_layout {\n`;
            hcl += `      height          = ${widget.layout.height || 8}\n`;
            hcl += `      is_column_break = false\n`;
            hcl += `      width           = ${widget.layout.width || 12}\n`;
            hcl += `      x               = ${widget.layout.x || 0}\n`;
            hcl += `      y               = ${widget.layout.y || 0}\n`;
            hcl += `    }\n\n`;
        }

        // Get widget configuration from mappings
        const widgetConfig = this.widgetMappings?.widgets?.[widgetType];

        if (widgetConfig) {
            hcl += this.generateConfiguredWidget(widgetConfig, definition, widgetType);
        } else {
            // Fallback for unknown widget types or when configuration isn't loaded
            hcl += `    # ${widgetType} widget - configuration not yet supported\n`;
            hcl += `    # Please add configuration for ${widgetType} to widget mappings\n`;
            if (definition.title) {
                hcl += `    # Title: ${definition.title}\n`;
            }
            if (definition.requests && definition.requests.length > 0) {
                hcl += `    # Has ${definition.requests.length} request(s)\n`;
            }
            hcl += `    # Widget definition: ${JSON.stringify(definition, null, 4).split('\n').join('\n    # ')}\n`;
        }

        hcl += `  }\n`;
        return hcl;
    }

    generateConfiguredWidget(widgetConfig, definition, widgetType) {
        let hcl = `    ${widgetConfig.blockName} {\n`;

        // Add live_span first if it exists (preserving original behavior)
        if (definition.live_span) {
            hcl += `      live_span   = "${definition.live_span}"\n`;
        }

        // Add common properties
        widgetConfig.commonProperties.forEach(prop => {
            if (definition[prop] !== undefined && prop !== 'live_span') { // Skip live_span since we already added it
                const value = this.formatPropertyValue(definition[prop]);
                hcl += `      ${prop} = ${value}\n`;
            }
        });

        // Add specific properties
        Object.entries(widgetConfig.specificProperties).forEach(([jsonProp, hclProp]) => {
            if (definition[jsonProp] !== undefined) {
                if (jsonProp === 'timeseries_background' && typeof definition[jsonProp] === 'object') {
                    // Handle timeseries_background as a block
                    hcl += `      ${hclProp} {\n`;
                    if (definition[jsonProp].type) {
                        hcl += `        type = "${definition[jsonProp].type}"\n`;
                    }
                    hcl += `      }\n`;
                } else {
                    const value = this.formatPropertyValue(definition[jsonProp]);
                    hcl += `      ${hclProp} = ${value}\n`;
                }
            }
        });

        // Handle requests based on structure type
        if (widgetConfig.requestStructure === 'modern' && definition.requests) {
            hcl += this.generateModernRequests(definition.requests);
        } else if (widgetConfig.requestStructure === 'legacy' && definition.requests) {
            hcl += this.generateLegacyRequests(definition.requests);
        }

        // Access features object properly
        const features = widgetConfig.features || {};

        // Handle yaxis configuration for widgets that support it
        if (features.supportsYAxis && definition.yaxis) {
            hcl += this.generateYAxisConfiguration(definition.yaxis);
        }

        // Handle events for widgets that support them
        if (features.supportsEvents && definition.events) {
            hcl += this.generateEventsConfiguration(definition.events);
        }

        // Handle style configuration for widgets that support it
        if (features.supportsStyle && definition.style) {
            hcl += this.generateStyleConfiguration(definition.style);
        }

        // Handle view configuration for widgets that support it
        if (features.supportsView && definition.view) {
            hcl += this.generateViewConfiguration(definition.view);
        }

        // Handle sort configuration for widgets that support it
        if (features.supportsSort && definition.sort) {
            hcl += this.generateSortConfiguration(definition.sort);
        }

        // Note: live_span is handled at widget level, time blocks are not needed

        // Handle nested widgets for group widgets
        if (features.hasNestedWidgets && definition.widgets) {
            definition.widgets.forEach((nestedWidget, index) => {
                hcl += this.generateNestedWidget(nestedWidget, index);
            });
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateYAxisConfiguration(yaxis) {
        let hcl = `\n      yaxis {\n`;

        if (yaxis.label) {
            hcl += `        label        = ${this.escapeHCLString(yaxis.label)}\n`;
        }
        if (yaxis.scale) {
            hcl += `        scale        = "${yaxis.scale}"\n`;
        }
        if (yaxis.min !== undefined) {
            hcl += `        min          = "${yaxis.min}"\n`;
        }
        if (yaxis.max !== undefined) {
            hcl += `        max          = "${yaxis.max}"\n`;
        }
        if (yaxis.include_zero !== undefined) {
            hcl += `        include_zero = ${yaxis.include_zero}\n`;
        }

        hcl += `      }\n`;
        return hcl;
    }

    generateEventsConfiguration(events) {
        let hcl = '';

        if (Array.isArray(events)) {
            events.forEach(event => {
                hcl += `\n      event {\n`;
                if (event.q) {
                    hcl += `        q = ${this.escapeHCLString(event.q)}\n`;
                }
                if (event.tags_execution) {
                    hcl += `        tags_execution = "${event.tags_execution}"\n`;
                }
                hcl += `      }\n`;
            });
        }

        return hcl;
    }

    generateStyleConfiguration(style) {
        let hcl = `\n      style {\n`;

        if (style.palette) {
            hcl += `        palette = "${style.palette}"\n`;
        }
        if (style.palette_flip !== undefined) {
            hcl += `        palette_flip = ${style.palette_flip}\n`;
        }

        hcl += `      }\n`;
        return hcl;
    }

    generateViewConfiguration(view) {
        let hcl = `\n      view {\n`;

        if (view.focus) {
            hcl += `        focus = "${view.focus}"\n`;
        }

        hcl += `      }\n`;
        return hcl;
    }

    generateSortConfiguration(sort) {
        let hcl = `\n      sort {\n`;

        if (sort.column) {
            hcl += `        column = "${sort.column}"\n`;
        }
        if (sort.order) {
            hcl += `        order = "${sort.order}"\n`;
        }

        hcl += `      }\n`;
        return hcl;
    }

    generateModernRequests(requests) {
        let hcl = '';

        requests.forEach((request, index) => {
            if (this.hasValidRequestContent(request)) {
                hcl += `\n      request {\n`;

                // Add request-level properties first (preserving original order)
                if (request.display_type) {
                    hcl += `        display_type   = "${request.display_type}"\n`;
                }
                if (request.on_right_yaxis !== undefined) {
                    hcl += `        on_right_yaxis = ${request.on_right_yaxis}\n`;
                }

                // Add conditional formats (preserving original order - before queries)
                if (request.conditional_formats && Array.isArray(request.conditional_formats)) {
                    hcl += `\n`;
                    request.conditional_formats.forEach(format => {
                        hcl += `        conditional_formats {\n`;
                        if (format.comparator) hcl += `          comparator = "${format.comparator}"\n`;
                        if (format.hide_value !== undefined) hcl += `          hide_value = ${format.hide_value}\n`;
                        if (format.palette) hcl += `          palette    = "${format.palette}"\n`;
                        if (format.value !== undefined) hcl += `          value      = ${format.value}\n`;
                        hcl += `        }\n`;
                    });
                }

                // Add formulas if present (preserving original order)
                if (request.formulas && Array.isArray(request.formulas)) {
                    request.formulas.forEach(formula => {
                        hcl += `\n        formula {\n`;
                        if (formula.alias) {
                            hcl += `          alias              = ${this.escapeHCLString(formula.alias)}\n`;
                        }
                        hcl += `          formula_expression = "${formula.formula || formula.formula_expression}"\n`;
                        if (formula.limit) {
                            hcl += `\n          limit {\n`;
                            if (formula.limit.count) hcl += `            count = ${formula.limit.count}\n`;
                            if (formula.limit.order) hcl += `            order = "${formula.limit.order}"\n`;
                            hcl += `          }\n`;
                        }
                        hcl += `        }\n`;
                    });
                }

                // Generate query blocks (modern format)
                if (request.queries && Array.isArray(request.queries)) {
                    request.queries.forEach(query => {
                        hcl += this.generateQueryBlock(query);
                    });
                } else if (request.q) {
                    // Convert legacy q to modern format
                    hcl += `\n        query {\n`;
                    hcl += `          metric_query {\n`;
                    hcl += `            aggregator  = "${request.aggregator || 'avg'}"\n`;
                    hcl += `            data_source = "metrics"\n`;
                    hcl += `            name        = "query1"\n`;
                    hcl += `            query       = ${this.escapeHCLString(request.q)}\n`;
                    hcl += `          }\n`;
                    hcl += `        }\n`;
                }

                // Add style
                if (request.style) {
                    hcl += `\n        style {\n`;
                    if (request.style.palette) hcl += `          palette = "${request.style.palette}"\n`;
                    if (request.style.line_type) hcl += `          line_type  = "${request.style.line_type}"\n`;
                    if (request.style.line_width) hcl += `          line_width = "${request.style.line_width}"\n`;
                    hcl += `        }\n`;
                }

                hcl += `      }\n`;
            }
        });

        return hcl;
    }

    generateQueryBlock(query) {
        let hcl = `\n        query {\n`;

        // Determine query type based on content
        if (query.data_source === 'metrics' || query.metric || query.query) {
            hcl += `\n          metric_query {\n`;
            if (query.aggregator) hcl += `            aggregator  = "${query.aggregator}"\n`;
            if (query.data_source) hcl += `            data_source = "${query.data_source}"\n`;
            if (query.name) hcl += `            name        = "${query.name}"\n`;
            if (query.query) hcl += `            query       = ${this.escapeHCLString(query.query)}\n`;
            hcl += `          }\n`;
        } else if (query.data_source === 'logs') {
            hcl += `\n          log_query {\n`;
            if (query.name) hcl += `            name = "${query.name}"\n`;
            if (query.data_source) hcl += `            data_source = "${query.data_source}"\n`;
            if (query.search && query.search.query) {
                hcl += `            search {\n`;
                hcl += `              query = ${this.escapeHCLString(query.search.query)}\n`;
                hcl += `            }\n`;
            }
            // Skip indexes as they're not supported in standard provider
            hcl += `          }\n`;
        }

        hcl += `        }\n`;
        return hcl;
    }

    generateNestedWidget(nestedWidget, index) {
        let hcl = `\n      widget {\n`;

        if (nestedWidget.id) {
            hcl += `        id = "${nestedWidget.id}"\n`;
        }

        if (nestedWidget.layout) {
            hcl += `        widget_layout {\n`;
            hcl += `          height          = ${nestedWidget.layout.height || 8}\n`;
            hcl += `          is_column_break = false\n`;
            hcl += `          width           = ${nestedWidget.layout.width || 12}\n`;
            hcl += `          x               = ${nestedWidget.layout.x || 0}\n`;
            hcl += `          y               = ${nestedWidget.layout.y || 0}\n`;
            hcl += `        }\n\n`;
        }

        const nestedDefinition = nestedWidget.definition || {};
        const nestedType = nestedDefinition.type || 'unknown';
        const widgetConfig = this.widgetMappings?.widgets?.[nestedType];

        if (widgetConfig) {
            // Generate the widget configuration and adjust indentation for nesting
            const widgetHCL = this.generateConfiguredWidget(widgetConfig, nestedDefinition, nestedType);
            // Adjust indentation from 4 spaces to 8 spaces for nested widgets
            hcl += widgetHCL.replace(/^    /gm, '        ');
        } else {
            hcl += `        # ${nestedType} widget - configuration not yet supported\n`;
            hcl += `        # Please add configuration for ${nestedType} to widget mappings\n`;
            if (nestedDefinition.title) {
                hcl += `        # Title: ${nestedDefinition.title}\n`;
            }
        }

        hcl += `      }\n`;
        return hcl;
    }

    hasValidRequestContent(request) {
        return request.q ||
               (request.queries && request.queries.length > 0) ||
               (request.formulas && request.formulas.length > 0);
    }

    formatPropertyValue(value) {
        if (typeof value === 'string') {
            return this.escapeHCLString(value);
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (Array.isArray(value)) {
            return JSON.stringify(value);
        } else if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return `"${value}"`;
    }

    generateGroupWidgetHCL(definition) {
        let hcl = `    group_definition {\n`;

        if (definition.title) {
            hcl += `      title       = ${this.escapeHCLString(definition.title)}\n`;
        }

        if (definition.layout_type) {
            hcl += `      layout_type = "${definition.layout_type}"\n`;
        }

        if (definition.background_color) {
            hcl += `      background_color = "${definition.background_color}"\n`;
        }

        if (definition.banner_img) {
            hcl += `      banner_img = "${definition.banner_img}"\n`;
        }

        if (definition.show_title !== undefined) {
            hcl += `      show_title = ${definition.show_title}\n`;
        }

        // Add nested widgets if available
        if (definition.widgets && definition.widgets.length > 0) {
            hcl += `\n      # Nested widgets in group\n`;
            definition.widgets.forEach((nestedWidget, index) => {
                hcl += `      widget {\n`;

                if (nestedWidget.id) {
                    hcl += `        id = "${nestedWidget.id}"\n`;
                }

                if (nestedWidget.layout) {
                    hcl += `        layout = {\n`;
                    hcl += `          x      = ${nestedWidget.layout.x || 0}\n`;
                    hcl += `          y      = ${nestedWidget.layout.y || 0}\n`;
                    hcl += `          width  = ${nestedWidget.layout.width || 12}\n`;
                    hcl += `          height = ${nestedWidget.layout.height || 8}\n`;
                    hcl += `        }\n`;
                }

                // Use configuration-driven approach for nested widgets
                const nestedDefinition = nestedWidget.definition || {};
                const nestedType = nestedDefinition.type || 'unknown';
                const widgetConfig = this.widgetMappings?.widgets?.[nestedType];

                if (widgetConfig) {
                    // Generate widget configuration with proper indentation
                    const widgetHCL = this.generateConfiguredWidget(widgetConfig, nestedDefinition, nestedType);
                    hcl += widgetHCL.replace(/^    /gm, '        ');
                } else {
                    hcl += `        # ${nestedType} widget - configuration not yet supported\n`;
                    hcl += `        # Please add configuration for ${nestedType} to widget mappings\n`;
                    if (nestedDefinition.title) {
                        hcl += `        # Title: ${nestedDefinition.title}\n`;
                    }
                    if (nestedDefinition.requests && nestedDefinition.requests.length > 0) {
                        hcl += `        # Has ${nestedDefinition.requests.length} request(s)\n`;
                    }
                }

                hcl += `      }\n`;
            });
        }

        hcl += `    }\n`;
        return hcl;
    }

    // Legacy widget generation methods - kept for backward compatibility
    // These are now superseded by the configuration-driven approach but maintained for fallback scenarios
    generateTimeseriesWidgetHCL(definition) {
        let hcl = `    timeseries_definition {\n`;

        if (definition.title) {
            hcl += `      title       = ${this.escapeHCLString(definition.title)}\n`;
        }

        if (definition.title_size) {
            hcl += `      title_size  = "${definition.title_size}"\n`;
        }

        if (definition.title_align) {
            hcl += `      title_align = "${definition.title_align}"\n`;
        }

        if (definition.show_legend !== undefined) {
            hcl += `      show_legend = ${definition.show_legend}\n`;
        }

        if (definition.legend_layout) {
            hcl += `      legend_layout = "${definition.legend_layout}"\n`;
        }

        if (definition.legend_columns && Array.isArray(definition.legend_columns)) {
            hcl += `      legend_columns = ${JSON.stringify(definition.legend_columns)}\n`;
        }

        if (definition.live_span) {
            hcl += `      live_span = "${definition.live_span}"\n`;
        }

        // Add requests only if they exist and have content
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;

                    if (request.q) {
                        hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    }

                    if (request.display_type) {
                        hcl += `        display_type = "${request.display_type}"\n`;
                    }

                    if (request.style) {
                        hcl += `        style {\n`;
                        if (request.style.palette) hcl += `          palette    = "${request.style.palette}"\n`;
                        if (request.style.line_type) hcl += `          line_type  = "${request.style.line_type}"\n`;
                        if (request.style.line_width) hcl += `          line_width = "${request.style.line_width}"\n`;
                        hcl += `        }\n`;
                    }

                    if (request.metadata && Array.isArray(request.metadata)) {
                        request.metadata.forEach((meta, metaIndex) => {
                            hcl += `        metadata {\n`;
                            if (meta.expression) hcl += `          expression = ${this.escapeHCLString(meta.expression)}\n`;
                            if (meta.alias_name) hcl += `          alias_name = ${this.escapeHCLString(meta.alias_name)}\n`;
                            hcl += `        }\n`;
                        });
                    }

                    hcl += `      }\n`;
                }
            });
        }

        // Add yaxis if available
        if (definition.yaxis) {
            hcl += `\n      yaxis {\n`;
            if (definition.yaxis.label) hcl += `        label        = ${this.escapeHCLString(definition.yaxis.label)}\n`;
            if (definition.yaxis.scale) hcl += `        scale        = "${definition.yaxis.scale}"\n`;
            if (definition.yaxis.min) hcl += `        min          = "${definition.yaxis.min}"\n`;
            if (definition.yaxis.max) hcl += `        max          = "${definition.yaxis.max}"\n`;
            if (definition.yaxis.include_zero !== undefined) hcl += `        include_zero = ${definition.yaxis.include_zero}\n`;
            hcl += `      }\n`;
        }

        // Add events if available
        if (definition.events && Array.isArray(definition.events)) {
            definition.events.forEach((event, index) => {
                hcl += `\n      event {\n`;
                if (event.q) hcl += `        q = ${this.escapeHCLString(event.q)}\n`;
                if (event.tags_execution) hcl += `        tags_execution = "${event.tags_execution}"\n`;
                hcl += `      }\n`;
            });
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateQueryValueWidgetHCL(definition) {
        let hcl = `    query_value_definition {\n`;

        if (definition.title) {
            hcl += `      title       = ${this.escapeHCLString(definition.title)}\n`;
        }

        if (definition.title_size) {
            hcl += `      title_size  = "${definition.title_size}"\n`;
        }

        if (definition.title_align) {
            hcl += `      title_align = "${definition.title_align}"\n`;
        }

        if (definition.live_span) {
            hcl += `      live_span = "${definition.live_span}"\n`;
        }

        if (definition.autoscale !== undefined) {
            hcl += `      autoscale = ${definition.autoscale}\n`;
        }

        if (definition.custom_unit) {
            hcl += `      custom_unit = "${definition.custom_unit}"\n`;
        }

        if (definition.precision !== undefined) {
            hcl += `      precision = ${definition.precision}\n`;
        }

        // Add requests only if they exist and have content
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;

                    if (request.q) {
                        hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    }

                    if (request.aggregator) {
                        hcl += `        aggregator = "${request.aggregator}"\n`;
                    }

                    if (request.conditional_formats && Array.isArray(request.conditional_formats)) {
                        request.conditional_formats.forEach((format, formatIndex) => {
                            hcl += `        conditional_formats {\n`;
                            if (format.comparator) hcl += `          comparator = "${format.comparator}"\n`;
                            if (format.value !== undefined) hcl += `          value      = ${format.value}\n`;
                            if (format.palette) hcl += `          palette    = "${format.palette}"\n`;
                            hcl += `        }\n`;
                        });
                    }

                    hcl += `      }\n`;
                }
            });
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateNoteWidgetHCL(definition) {
        let hcl = `    note_definition {\n`;

        if (definition.content) {
            hcl += `      content          = ${this.escapeHCLString(definition.content)}\n`;
        }

        if (definition.background_color) {
            hcl += `      background_color = "${definition.background_color}"\n`;
        }

        if (definition.font_size) {
            hcl += `      font_size        = "${definition.font_size}"\n`;
        }

        if (definition.text_align) {
            hcl += `      text_align       = "${definition.text_align}"\n`;
        }

        if (definition.vertical_align) {
            hcl += `      vertical_align   = "${definition.vertical_align}"\n`;
        }

        if (definition.show_tick !== undefined) {
            hcl += `      show_tick        = ${definition.show_tick}\n`;
        }

        if (definition.tick_pos) {
            hcl += `      tick_pos         = "${definition.tick_pos}"\n`;
        }

        if (definition.tick_edge) {
            hcl += `      tick_edge        = "${definition.tick_edge}"\n`;
        }

        if (definition.has_padding !== undefined) {
            hcl += `      has_padding      = ${definition.has_padding}\n`;
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateToplistWidgetHCL(definition) {
        let hcl = `    toplist_definition {\n`;

        if (definition.title) {
            hcl += `      title       = ${this.escapeHCLString(definition.title)}\n`;
        }

        if (definition.title_size) {
            hcl += `      title_size  = "${definition.title_size}"\n`;
        }

        if (definition.title_align) {
            hcl += `      title_align = "${definition.title_align}"\n`;
        }

        if (definition.live_span) {
            hcl += `      live_span = "${definition.live_span}"\n`;
        }

        // Add requests only if they exist and have content
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;

                    if (request.q) {
                        hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    }

                    if (request.conditional_formats && Array.isArray(request.conditional_formats)) {
                        request.conditional_formats.forEach((format, formatIndex) => {
                            hcl += `        conditional_formats {\n`;
                            if (format.comparator) hcl += `          comparator = "${format.comparator}"\n`;
                            if (format.value !== undefined) hcl += `          value      = ${format.value}\n`;
                            if (format.palette) hcl += `          palette    = "${format.palette}"\n`;
                            hcl += `        }\n`;
                        });
                    }

                    if (request.style) {
                        hcl += `        style {\n`;
                        if (request.style.palette) hcl += `          palette = "${request.style.palette}"\n`;
                        hcl += `        }\n`;
                    }

                    hcl += `      }\n`;
                }
            });
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateScatterplotWidgetHCL(definition) {
        let hcl = `    scatterplot_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.color_by_groups && Array.isArray(definition.color_by_groups)) {
            hcl += `      color_by_groups = ${JSON.stringify(definition.color_by_groups)}\n`;
        }
        // Add requests only if they exist and have content
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.x || request.y || request.q || request.queries) {
                    hcl += `\n      request {\n`;
                    if (request.x) hcl += `        x = ${this.escapeHCLString(request.x)}\n`;
                    if (request.y) hcl += `        y = ${this.escapeHCLString(request.y)}\n`;
                    if (request.q) hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    hcl += `      }\n`;
                }
            });
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateHeatmapWidgetHCL(definition) {
        let hcl = `    heatmap_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;
                    if (request.q) hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    if (request.style) {
                        hcl += `        style {\n`;
                        if (request.style.palette) hcl += `          palette = "${request.style.palette}"\n`;
                        hcl += `        }\n`;
                    }
                    hcl += `      }\n`;
                }
            });
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateDistributionWidgetHCL(definition) {
        let hcl = `    distribution_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;
                    if (request.q) hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    hcl += `      }\n`;
                }
            });
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateCheckStatusWidgetHCL(definition) {
        let hcl = `    check_status_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.check) hcl += `      check = ${this.escapeHCLString(definition.check)}\n`;
        if (definition.grouping) hcl += `      grouping = "${definition.grouping}"\n`;
        if (definition.group_by && Array.isArray(definition.group_by)) {
            hcl += `      group_by = ${JSON.stringify(definition.group_by)}\n`;
        }
        if (definition.tags && Array.isArray(definition.tags)) {
            hcl += `      tags = ${JSON.stringify(definition.tags)}\n`;
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateHostmapWidgetHCL(definition) {
        let hcl = `    hostmap_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;
                    if (request.q) hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    hcl += `      }\n`;
                }
            });
        }
        if (definition.node_type) hcl += `      node_type = "${definition.node_type}"\n`;
        if (definition.no_metric_hosts !== undefined) hcl += `      no_metric_hosts = ${definition.no_metric_hosts}\n`;
        if (definition.no_group_hosts !== undefined) hcl += `      no_group_hosts = ${definition.no_group_hosts}\n`;
        if (definition.scope && Array.isArray(definition.scope)) {
            hcl += `      scope = ${JSON.stringify(definition.scope)}\n`;
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateServiceMapWidgetHCL(definition) {
        let hcl = `    service_map_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.service) hcl += `      service = ${this.escapeHCLString(definition.service)}\n`;
        if (definition.env) hcl += `      env = ${this.escapeHCLString(definition.env)}\n`;
        if (definition.filters && Array.isArray(definition.filters)) {
            hcl += `      filters = ${JSON.stringify(definition.filters)}\n`;
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateLogStreamWidgetHCL(definition) {
        let hcl = `    log_stream_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.query) hcl += `      query = ${this.escapeHCLString(definition.query)}\n`;
        if (definition.logset) hcl += `      logset = ${this.escapeHCLString(definition.logset)}\n`;
        if (definition.columns && Array.isArray(definition.columns)) {
            hcl += `      columns = ${JSON.stringify(definition.columns)}\n`;
        }
        if (definition.indexes && Array.isArray(definition.indexes)) {
            hcl += `      indexes = ${JSON.stringify(definition.indexes)}\n`;
        }
        if (definition.message_display) hcl += `      message_display = "${definition.message_display}"\n`;
        if (definition.show_date_column !== undefined) hcl += `      show_date_column = ${definition.show_date_column}\n`;
        if (definition.show_message_column !== undefined) hcl += `      show_message_column = ${definition.show_message_column}\n`;
        if (definition.sort) {
            hcl += `      sort {\n`;
            if (definition.sort.column) hcl += `        column = "${definition.sort.column}"\n`;
            if (definition.sort.order) hcl += `        order = "${definition.sort.order}"\n`;
            hcl += `      }\n`;
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateTraceServiceWidgetHCL(definition) {
        let hcl = `    trace_service_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.service) hcl += `      service = ${this.escapeHCLString(definition.service)}\n`;
        if (definition.env) hcl += `      env = ${this.escapeHCLString(definition.env)}\n`;
        if (definition.span_name) hcl += `      span_name = ${this.escapeHCLString(definition.span_name)}\n`;
        if (definition.show_hits !== undefined) hcl += `      show_hits = ${definition.show_hits}\n`;
        if (definition.show_errors !== undefined) hcl += `      show_errors = ${definition.show_errors}\n`;
        if (definition.show_latency !== undefined) hcl += `      show_latency = ${definition.show_latency}\n`;
        if (definition.show_breakdown !== undefined) hcl += `      show_breakdown = ${definition.show_breakdown}\n`;
        if (definition.show_distribution !== undefined) hcl += `      show_distribution = ${definition.show_distribution}\n`;
        if (definition.show_resource_list !== undefined) hcl += `      show_resource_list = ${definition.show_resource_list}\n`;
        if (definition.size_format) hcl += `      size_format = "${definition.size_format}"\n`;
        if (definition.display_format) hcl += `      display_format = "${definition.display_format}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateIframeWidgetHCL(definition) {
        let hcl = `    iframe_definition {\n`;
        if (definition.url) hcl += `      url = ${this.escapeHCLString(definition.url)}\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateImageWidgetHCL(definition) {
        let hcl = `    image_definition {\n`;
        if (definition.url) hcl += `      url = ${this.escapeHCLString(definition.url)}\n`;
        if (definition.url_dark_theme) hcl += `      url_dark_theme = ${this.escapeHCLString(definition.url_dark_theme)}\n`;
        if (definition.sizing) hcl += `      sizing = "${definition.sizing}"\n`;
        if (definition.margin) hcl += `      margin = "${definition.margin}"\n`;
        if (definition.has_background !== undefined) hcl += `      has_background = ${definition.has_background}\n`;
        if (definition.has_border !== undefined) hcl += `      has_border = ${definition.has_border}\n`;
        if (definition.horizontal_align) hcl += `      horizontal_align = "${definition.horizontal_align}"\n`;
        if (definition.vertical_align) hcl += `      vertical_align = "${definition.vertical_align}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateFreeTextWidgetHCL(definition) {
        let hcl = `    free_text_definition {\n`;
        if (definition.text) hcl += `      text = ${this.escapeHCLString(definition.text)}\n`;
        if (definition.color) hcl += `      color = "${definition.color}"\n`;
        if (definition.font_size) hcl += `      font_size = "${definition.font_size}"\n`;
        if (definition.text_align) hcl += `      text_align = "${definition.text_align}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateAlertGraphWidgetHCL(definition) {
        let hcl = `    alert_graph_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.alert_id) hcl += `      alert_id = "${definition.alert_id}"\n`;
        if (definition.viz_type) hcl += `      viz_type = "${definition.viz_type}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateAlertValueWidgetHCL(definition) {
        let hcl = `    alert_value_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.alert_id) hcl += `      alert_id = "${definition.alert_id}"\n`;
        if (definition.precision !== undefined) hcl += `      precision = ${definition.precision}\n`;
        if (definition.unit) hcl += `      unit = "${definition.unit}"\n`;
        if (definition.text_align) hcl += `      text_align = "${definition.text_align}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateChangeWidgetHCL(definition) {
        let hcl = `    change_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.q || request.queries || (request.formulas && request.formulas.length > 0)) {
                    hcl += `\n      request {\n`;
                    if (request.q) hcl += `        q = ${this.escapeHCLString(request.q)}\n`;
                    if (request.change_type) hcl += `        change_type = "${request.change_type}"\n`;
                    if (request.compare_to) hcl += `        compare_to = "${request.compare_to}"\n`;
                    if (request.increase_good !== undefined) hcl += `        increase_good = ${request.increase_good}\n`;
                    if (request.order_by) hcl += `        order_by = "${request.order_by}"\n`;
                    if (request.order_dir) hcl += `        order_dir = "${request.order_dir}"\n`;
                    if (request.show_present !== undefined) hcl += `        show_present = ${request.show_present}\n`;
                    hcl += `      }\n`;
                }
            });
        }
        hcl += `    }\n`;
        return hcl;
    }

    generateEventStreamWidgetHCL(definition) {
        let hcl = `    event_stream_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.query) hcl += `      query = ${this.escapeHCLString(definition.query)}\n`;
        if (definition.event_size) hcl += `      event_size = "${definition.event_size}"\n`;
        if (definition.tags_execution) hcl += `      tags_execution = "${definition.tags_execution}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateEventTimelineWidgetHCL(definition) {
        let hcl = `    event_timeline_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.query) hcl += `      query = ${this.escapeHCLString(definition.query)}\n`;
        if (definition.tags_execution) hcl += `      tags_execution = "${definition.tags_execution}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateSLOWidgetHCL(definition) {
        let hcl = `    service_level_objective_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.view_type) hcl += `      view_type = "${definition.view_type}"\n`;
        if (definition.slo_id) hcl += `      slo_id = "${definition.slo_id}"\n`;
        if (definition.show_error_budget !== undefined) hcl += `      show_error_budget = ${definition.show_error_budget}\n`;
        if (definition.view_mode) hcl += `      view_mode = "${definition.view_mode}"\n`;
        if (definition.time_windows && Array.isArray(definition.time_windows)) {
            hcl += `      time_windows = ${JSON.stringify(definition.time_windows)}\n`;
        }
        if (definition.global_time_target) hcl += `      global_time_target = "${definition.global_time_target}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateMonitorSummaryWidgetHCL(definition) {
        let hcl = `    monitor_summary_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.query) hcl += `      query = ${this.escapeHCLString(definition.query)}\n`;
        if (definition.summary_type) hcl += `      summary_type = "${definition.summary_type}"\n`;
        if (definition.sort) hcl += `      sort = "${definition.sort}"\n`;
        if (definition.display_format) hcl += `      display_format = "${definition.display_format}"\n`;
        if (definition.color_preference) hcl += `      color_preference = "${definition.color_preference}"\n`;
        if (definition.hide_zero_counts !== undefined) hcl += `      hide_zero_counts = ${definition.hide_zero_counts}\n`;
        if (definition.show_last_triggered !== undefined) hcl += `      show_last_triggered = ${definition.show_last_triggered}\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateManageStatusWidgetHCL(definition) {
        let hcl = `    manage_status_definition {\n`;
        if (definition.title) hcl += `      title = ${this.escapeHCLString(definition.title)}\n`;
        if (definition.summary_type) hcl += `      summary_type = "${definition.summary_type}"\n`;
        if (definition.display_format) hcl += `      display_format = "${definition.display_format}"\n`;
        if (definition.color_preference) hcl += `      color_preference = "${definition.color_preference}"\n`;
        if (definition.hide_zero_counts !== undefined) hcl += `      hide_zero_counts = ${definition.hide_zero_counts}\n`;
        if (definition.query) hcl += `      query = ${this.escapeHCLString(definition.query)}\n`;
        if (definition.sort) hcl += `      sort = "${definition.sort}"\n`;
        hcl += `    }\n`;
        return hcl;
    }

    generateGeomapWidgetHCL(definition) {
        let hcl = `    geomap_definition {\n`;

        if (definition.title) {
            hcl += `      title       = ${this.escapeHCLString(definition.title)}\n`;
        }

        if (definition.title_size) {
            hcl += `      title_size  = "${definition.title_size}"\n`;
        }

        if (definition.title_align) {
            hcl += `      title_align = "${definition.title_align}"\n`;
        }

        if (definition.live_span) {
            hcl += `      live_span = "${definition.live_span}"\n`;
        }

        // Add requests only if they exist and have content
        if (definition.requests && Array.isArray(definition.requests) && definition.requests.length > 0) {
            definition.requests.forEach((request, index) => {
                // Only create request block if it has meaningful content
                if (request.queries || request.q || request.formulas) {
                    hcl += `\n      request {\n`;

                    // Handle log-based queries
                    if (request.queries && Array.isArray(request.queries)) {
                        request.queries.forEach((query, queryIndex) => {
                            hcl += `        log_query {\n`;
                            if (query.name) hcl += `          name = "${query.name}"\n`;
                            if (query.data_source) hcl += `          data_source = "${query.data_source}"\n`;

                            if (query.search && query.search.query) {
                                hcl += `          search {\n`;
                                hcl += `            query = ${this.escapeHCLString(query.search.query)}\n`;
                                hcl += `          }\n`;
                            }

                            if (query.indexes && Array.isArray(query.indexes)) {
                                hcl += `          indexes = ${JSON.stringify(query.indexes)}\n`;
                            }

                            if (query.group_by && Array.isArray(query.group_by)) {
                                query.group_by.forEach((group, groupIndex) => {
                                    hcl += `          group_by {\n`;
                                    if (group.facet) hcl += `            facet = ${this.escapeHCLString(group.facet)}\n`;
                                    if (group.limit) hcl += `            limit = ${group.limit}\n`;
                                    if (group.sort) {
                                        hcl += `            sort {\n`;
                                        if (group.sort.aggregation) hcl += `              aggregation = "${group.sort.aggregation}"\n`;
                                        if (group.sort.order) hcl += `              order = "${group.sort.order}"\n`;
                                        hcl += `            }\n`;
                                    }
                                    hcl += `          }\n`;
                                });
                            }

                            if (query.compute && query.compute.aggregation) {
                                hcl += `          compute {\n`;
                                hcl += `            aggregation = "${query.compute.aggregation}"\n`;
                                hcl += `          }\n`;
                            }

                            hcl += `        }\n`;
                        });
                    }

                    // Handle formulas
                    if (request.formulas && Array.isArray(request.formulas)) {
                        request.formulas.forEach((formula, formulaIndex) => {
                            hcl += `        formula {\n`;
                            if (formula.formula) hcl += `          formula_expression = ${this.escapeHCLString(formula.formula)}\n`;
                            hcl += `        }\n`;
                        });
                    }

                    // Handle response format
                    if (request.response_format) {
                        hcl += `        response_format = "${request.response_format}"\n`;
                    }

                    hcl += `      }\n`;
                }
            });
        }

        // Add style configuration
        if (definition.style) {
            hcl += `\n      style {\n`;
            if (definition.style.palette) hcl += `        palette = "${definition.style.palette}"\n`;
            if (definition.style.palette_flip !== undefined) hcl += `        palette_flip = ${definition.style.palette_flip}\n`;
            hcl += `      }\n`;
        }

        // Add view configuration
        if (definition.view) {
            hcl += `\n      view {\n`;
            if (definition.view.focus) hcl += `        focus = "${definition.view.focus}"\n`;
            hcl += `      }\n`;
        }

        hcl += `    }\n`;
        return hcl;
    }

    generateResourceName(title, preserveOriginalNamingConvention = false) {
        if (preserveOriginalNamingConvention) {
            // Preserve original naming convention (uppercase with underscores)
            return title
                .replace(/[^a-zA-Z0-9_]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
                .substring(0, 50) || 'Imported_Dashboard';
        } else {
            // Standard convention (lowercase with underscores)
            return title
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
                .substring(0, 50) || 'imported_dashboard';
        }
    }

    escapeHCLString(str) {
        if (typeof str !== 'string') return `"${str}"`;

        // Escape special characters for HCL
        const escaped = str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');

        return `"${escaped}"`;
    }

    displayOutput(hcl) {
        this.hclOutput.innerHTML = `<code>${this.escapeHtml(hcl)}</code>`;
    }

    displayError(message) {
        this.inputError.textContent = message;
    }

    displaySuccess(message) {
        this.outputSuccess.textContent = message;
        setTimeout(() => {
            this.outputSuccess.textContent = '';
        }, 3000);
    }

    clearOutput() {
        this.hclOutput.innerHTML = '<code>// Generated Terraform HCL will appear here...</code>';
    }

    clearMessages() {
        this.inputError.textContent = '';
        this.outputSuccess.textContent = '';
    }

    clearInput() {
        this.jsonInput.value = '';
        this.clearOutput();
        this.clearMessages();
        this.clearValidationResults();
        this.disableOutputButtons();
        this.jsonInput.focus();
    }

    enableOutputButtons() {
        this.copyBtn.disabled = false;
        this.downloadBtn.disabled = false;
        if (this.validateBtn) {
            this.validateBtn.disabled = false;
        }
    }

    disableOutputButtons() {
        this.copyBtn.disabled = true;
        this.downloadBtn.disabled = true;
        if (this.validateBtn) {
            this.validateBtn.disabled = true;
        }
    }

    // File handling
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.includes('json') && !file.name.endsWith('.json')) {
            this.displayError('Please select a JSON file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.displayError('File too large. Please select a file smaller than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.jsonInput.value = e.target.result;
            this.processInput();
            this.displaySuccess(`Loaded file: ${file.name}`);
        };
        reader.onerror = () => {
            this.displayError('Error reading file');
        };
        reader.readAsText(file);
    }

    // Drag and drop handlers
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDragEnter(event) {
        event.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        if (!this.dropZone.contains(event.relatedTarget)) {
            this.dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(event) {
        event.preventDefault();
        this.dropZone.classList.remove('drag-over');

        const files = Array.from(event.dataTransfer.files);
        const jsonFile = files.find(file =>
            file.type.includes('json') || file.name.endsWith('.json')
        );

        if (jsonFile) {
            this.processFile(jsonFile);
        } else {
            this.displayError('Please drop a JSON file');
        }
    }

    // Output operations
    async copyToClipboard() {
        const hclText = this.hclOutput.textContent;

        try {
            await navigator.clipboard.writeText(hclText);
            this.displaySuccess('HCL copied to clipboard!');
            this.trackAction('copy');
        } catch (error) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(hclText);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.displaySuccess('HCL copied to clipboard!');
            this.trackAction('copy_fallback');
        } catch (error) {
            this.displayError('Failed to copy to clipboard');
        }

        document.body.removeChild(textArea);
    }

    downloadFile() {
        const hclText = this.hclOutput.textContent;
        const blob = new Blob([hclText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'datadog-dashboard.tf';
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
        this.displaySuccess('HCL file downloaded!');
        this.trackAction('download');
    }

    // Theme handling
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.trackAction('theme_toggle', newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        this.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
        localStorage.setItem('datadog-hcl-theme', theme);
    }

    // Event handlers
    handleBeforeUnload(event) {
        const hasContent = this.jsonInput.value.trim().length > 0;
        if (hasContent) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    handleOnlineStatus() {
        this.displaySuccess('Back online!');
    }

    handleOfflineStatus() {
        this.displaySuccess('Working offline - your data stays private!');
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.clearInput();
                    this.trackAction('keyboard_clear');
                    break;
                case 'v':
                    // Ctrl+V for validate (when not in input field to avoid conflict with paste)
                    if (event.target !== this.jsonInput && !this.copyBtn.disabled) {
                        event.preventDefault();
                        this.validateHCL();
                        this.trackAction('keyboard_validate');
                    }
                    break;
                case 'l':
                    // Ctrl+L for load sample
                    event.preventDefault();
                    this.loadSampleData();
                    this.trackAction('keyboard_load_sample');
                    break;
                case 'Enter':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.copyToClipboard();
                    }
                    break;
                case 's':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.downloadFile();
                    }
                    break;
                case 'f':
                    // Ctrl+Shift+F to focus on input
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.jsonInput.focus();
                        this.trackAction('keyboard_focus_input');
                    }
                    break;
            }
        }

        // ESC to close validation panel
        if (event.key === 'Escape' && this.validationPanel && this.validationPanel.style.display !== 'none') {
            event.preventDefault();
            this.clearValidationResults();
            this.trackAction('keyboard_close_validation');
        }
    }

    // Analytics (privacy-first, no personal data) - lightweight tracking
    trackPageView() {
        // Intentionally minimal - could be extended for privacy-first analytics
    }

    trackConversion(status, error = null) {
        // Track conversion success/failure for internal metrics
        if (error) console.warn('Conversion failed:', error);
    }

    trackAction(action, value = null) {
        // Track user actions for UX improvement insights
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API methods
    getVersion() {
        return this.version;
    }

    getStats() {
        return {
            version: this.version,
            theme: document.documentElement.getAttribute('data-theme') || 'light',
            hasContent: this.jsonInput.value.trim().length > 0,
            isOnline: navigator.onLine
        };
    }

    initializeValidation() {
        // Create validation UI elements
        this.createValidationUI();

        // Initialize validation patterns
        this.validationPatterns = {
            // Basic HCL syntax patterns
            validResourceName: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
            validIdentifier: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
            validStringLiteral: /^"([^"\\]|\\.)*"$/,
            validNumber: /^-?\d+(\.\d+)?$/,
            validBoolean: /^(true|false)$/,

            // Terraform-specific patterns
            validResourceType: /^[a-z]+_[a-z_]+$/,
            validDataSource: /^data\.[a-z]+_[a-z_]+\.[a-zA-Z_][a-zA-Z0-9_]*$/,
            validVariable: /^var\.[a-zA-Z_][a-zA-Z0-9_]*$/,
            validLocal: /^local\.[a-zA-Z_][a-zA-Z0-9_]*$/,

            // Datadog-specific patterns
            validDashboardId: /^[a-z0-9-]{36}$|^[a-z0-9-]+$/,
            validMetricQuery: /^[a-zA-Z0-9_\.\-\{\}\[\]\(\)\*\+\?\|\^$\\:,\s]+$/,
            validColor: /^#[0-9a-fA-F]{6}$|^[a-zA-Z_]+$/,
        };

        // Common validation rules
        this.validationRules = {
            required_dashboard_fields: ['title', 'layout_type'],
            valid_layout_types: ['ordered', 'free'],
            valid_widget_types: [
                'group', 'timeseries', 'query_value', 'note', 'toplist',
                'scatterplot', 'heatmap', 'distribution', 'check_status',
                'hostmap', 'service_map', 'log_stream', 'trace_service',
                'iframe', 'image', 'free_text', 'alert_graph', 'alert_value',
                'change', 'event_stream', 'event_timeline', 'slo',
                'monitor_summary', 'manage_status', 'geomap'
            ],
            valid_display_types: ['line', 'area', 'bars'],
            valid_aggregators: ['avg', 'max', 'min', 'sum', 'last'],
            valid_comparators: ['>', '<', '>=', '<=', '==', '!='],
            valid_palettes: ['dog_classic', 'cool', 'warm', 'purple', 'orange', 'gray'],
            valid_text_aligns: ['left', 'center', 'right'],
            valid_font_sizes: ['14', '16', '18', '24', '36', '48', '60'],
        };
    }

    async initializeWidgetMappings() {
        try {
            // Load configuration from external file
            const response = await fetch('widget-config.json');
            if (!response.ok) {
                throw new Error(`Failed to load widget configuration: ${response.status}`);
            }

            const config = await response.json();
            console.log(`Loaded widget configuration v${config.version}`);

            // Set configuration properties
            this.widgetMappings = {
                layout: config.layout,
                widgets: config.widgets,
                requestStructures: config.requestStructures,
                styles: config.styleBlocks
            };

            // Set validation rules
            this.validationRules = config.validationRules;

            // Log successful configuration load
            const widgetCount = Object.keys(config.widgets).length;
            console.log(`✅ Loaded ${widgetCount} widget configurations with modern Terraform syntax support`);

        } catch (error) {
            console.error('Failed to load widget configuration, falling back to embedded config:', error);

            // Fallback to minimal embedded configuration
            this.initializeFallbackConfiguration();
        }
    }

    initializeFallbackConfiguration() {
        console.warn('Using fallback configuration - some features may be limited');

        // Minimal fallback configuration
        this.widgetMappings = {
            layout: {
                blockName: 'widget_layout',
                properties: {
                    x: 'x',
                    y: 'y',
                    width: 'width',
                    height: 'height',
                    is_column_break: 'is_column_break'
                },
                defaults: {
                    is_column_break: false
                }
            },
            widgets: {
                timeseries: {
                    blockName: 'timeseries_definition',
                    commonProperties: ['title', 'title_size', 'title_align', 'live_span'],
                    specificProperties: {
                        show_legend: 'show_legend',
                        legend_layout: 'legend_layout',
                        legend_columns: 'legend_columns',
                        legend_size: 'legend_size'
                    },
                    requestStructure: 'modern',
                    features: {
                        supportsYAxis: true,
                        supportsEvents: true
                    }
                },
                query_value: {
                    blockName: 'query_value_definition',
                    commonProperties: ['title', 'title_size', 'title_align', 'live_span'],
                    specificProperties: {
                        autoscale: 'autoscale',
                        precision: 'precision',
                        custom_unit: 'custom_unit',
                        text_align: 'text_align'
                    },
                    requestStructure: 'modern',
                    features: {
                        supportsConditionalFormats: true
                    }
                },
                note: {
                    blockName: 'note_definition',
                    commonProperties: [],
                    specificProperties: {
                        content: 'content',
                        background_color: 'background_color',
                        font_size: 'font_size',
                        text_align: 'text_align',
                        vertical_align: 'vertical_align',
                        show_tick: 'show_tick',
                        tick_pos: 'tick_pos',
                        tick_edge: 'tick_edge',
                        has_padding: 'has_padding'
                    },
                    requestStructure: 'none',
                    features: {}
                },
                group: {
                    blockName: 'group_definition',
                    commonProperties: ['title', 'layout_type'],
                    specificProperties: {
                        background_color: 'background_color',
                        banner_img: 'banner_img',
                        show_title: 'show_title'
                    },
                    requestStructure: 'none',
                    features: {
                        hasNestedWidgets: true
                    }
                }
            },
            requestStructures: {
                legacy: {
                    queryProperty: 'q',
                    supportsFormulas: false,
                    supportsConditionalFormats: true
                },
                modern: {
                    hasQueryBlock: true,
                    supportsFormulas: true,
                    supportsConditionalFormats: true,
                    queryTypes: {
                        metric_query: {
                            properties: ['data_source', 'name', 'query', 'aggregator'],
                            required: ['query']
                        },
                        log_query: {
                            properties: ['data_source', 'name', 'search', 'indexes', 'group_by', 'compute'],
                            required: ['search']
                        }
                    }
                }
            },
            styles: {
                conditional_formats: {
                    properties: ['comparator', 'value', 'palette', 'hide_value']
                },
                style: {
                    properties: ['palette', 'line_type', 'line_width']
                },
                formula: {
                    properties: ['formula_expression', 'limit']
                }
            }
        };

        this.validationRules = {
            required_dashboard_fields: ['title', 'layout_type'],
            valid_layout_types: ['ordered', 'free'],
            valid_widget_types: ['timeseries', 'query_value', 'note', 'group'],
            valid_display_types: ['line', 'area', 'bars'],
            valid_aggregators: ['avg', 'max', 'min', 'sum', 'last'],
            valid_comparators: ['>', '<', '>=', '<=', '==', '!='],
            valid_palettes: ['dog_classic', 'cool', 'warm', 'purple', 'orange', 'gray'],
            valid_text_aligns: ['left', 'center', 'right'],
            valid_font_sizes: ['14', '16', '18', '24', '36', '48', '60']
        };
    }

    createValidationUI() {
        // Use existing validation button if it exists, otherwise create one
        this.validateBtn = document.getElementById('validate-hcl');
        if (this.validateBtn) {
            // Add event listener to existing button
            this.validateBtn.onclick = () => this.validateHCL();
        } else {
            // Create validation button if it doesn't exist
            this.validateBtn = document.createElement('button');
            this.validateBtn.className = 'btn btn-secondary';
            this.validateBtn.innerHTML = '✅ Validate HCL';
            this.validateBtn.onclick = () => this.validateHCL();

            // Add to output controls
            const outputControls = document.querySelector('.output-controls');
            if (outputControls) {
                outputControls.appendChild(this.validateBtn);
            }
        }

        // Create validation panel
        this.validationPanel = document.createElement('div');
        this.validationPanel.className = 'validation-panel';
        this.validationPanel.style.display = 'none';
        this.validationPanel.innerHTML = `
            <div class="validation-header">
                <h3>🔍 HCL Validation Results</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="validation-content">
                <div class="validation-summary"></div>
                <div class="validation-details"></div>
            </div>
        `;

        // Add to output section
        const outputSection = document.querySelector('.output-section');
        if (outputSection) {
            outputSection.appendChild(this.validationPanel);
        }

        // Add validation styles
        this.addValidationStyles();
    }

    addValidationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .validation-panel {
                margin-top: 1rem;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--surface-color);
                overflow: hidden;
            }

            .validation-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                background: var(--primary-color);
                color: white;
            }

            .validation-header h3 {
                margin: 0;
                font-size: 1.1rem;
            }

            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 2rem;
                height: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .validation-content {
                padding: 1rem;
            }

            .validation-summary {
                margin-bottom: 1rem;
                padding: 1rem;
                border-radius: 6px;
                font-weight: 500;
            }

            .validation-summary.valid {
                background: var(--success-bg);
                color: var(--success-color);
                border: 1px solid var(--success-color);
            }

            .validation-summary.invalid {
                background: var(--error-bg);
                color: var(--error-color);
                border: 1px solid var(--error-color);
            }

            .validation-summary.warning {
                background: var(--warning-bg);
                color: var(--warning-color);
                border: 1px solid var(--warning-color);
            }

            .validation-details {
                max-height: 400px;
                overflow-y: auto;
            }

            .validation-issue {
                margin-bottom: 0.75rem;
                padding: 0.75rem;
                border-radius: 4px;
                border-left: 4px solid;
            }

            .validation-issue.error {
                background: var(--error-bg);
                border-left-color: var(--error-color);
            }

            .validation-issue.warning {
                background: var(--warning-bg);
                border-left-color: var(--warning-color);
            }

            .validation-issue.info {
                background: var(--info-bg);
                border-left-color: var(--info-color);
            }

            .validation-issue-title {
                font-weight: 600;
                margin-bottom: 0.25rem;
            }

            .validation-issue-description {
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .validation-issue-location {
                font-size: 0.8rem;
                font-family: var(--font-mono);
                margin-top: 0.25rem;
                opacity: 0.7;
            }

            .validation-stats {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border-color);
            }

            .validation-stat {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .validation-stat-icon {
                width: 1rem;
                height: 1rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: bold;
                color: white;
            }

            .validation-stat-icon.error { background: var(--error-color); }
            .validation-stat-icon.warning { background: var(--warning-color); }
            .validation-stat-icon.info { background: var(--info-color); }
            .validation-stat-icon.success { background: var(--success-color); }

            /* Dark theme adjustments */
            [data-theme="dark"] .validation-panel {
                border-color: var(--border-color-dark);
            }

            [data-theme="dark"] .validation-content {
                background: var(--surface-color-dark);
            }
        `;
        document.head.appendChild(style);
    }

    validateHCL() {
        const hclContent = this.hclOutput.textContent;

        if (!hclContent || hclContent.includes('Generated Terraform HCL will appear here')) {
            this.displayValidationError('No HCL content to validate. Please generate HCL first.');
            return;
        }

        // Ensure validation components are initialized
        if (!this.validationRules || !this.validationPatterns) {
            this.displayValidationError('Validation system not ready. Please wait for initialization to complete.');
            return;
        }

        try {
            const validationResult = this.performHCLValidation(hclContent);
            this.displayValidationResults(validationResult);
            this.trackAction('validation_performed', validationResult.isValid ? 'valid' : 'invalid');
        } catch (error) {
            this.displayValidationError(`Validation failed: ${error.message}`);
            this.trackAction('validation_error', error.message);
        }
    }

    performHCLValidation(hclContent) {
        const issues = [];
        const lines = hclContent.split('\n');

        // 1. Basic syntax validation
        this.validateBasicSyntax(lines, issues);

        // 2. Terraform structure validation
        this.validateTerraformStructure(hclContent, issues);

        // 3. Datadog provider-specific validation
        this.validateDatadogProvider(hclContent, issues);

        // 4. Best practices validation
        this.validateBestPractices(hclContent, issues);

        // Calculate validation summary
        const errors = issues.filter(issue => issue.severity === 'error');
        const warnings = issues.filter(issue => issue.severity === 'warning');
        const infos = issues.filter(issue => issue.severity === 'info');

        return {
            isValid: errors.length === 0,
            issues: issues,
            summary: {
                errors: errors.length,
                warnings: warnings.length,
                infos: infos.length,
                total: issues.length
            }
        };
    }

    validateBasicSyntax(lines, issues) {
        let braceCount = 0;
        let bracketCount = 0;
        let parenCount = 0;
        let inString = false;
        let inComment = false;

        lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
                return;
            }

            // Check for unclosed strings (basic check)
            let quoteCount = 0;
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"' && (i === 0 || line[i-1] !== '\\')) {
                    quoteCount++;
                }
            }
            if (quoteCount % 2 !== 0) {
                issues.push({
                    severity: 'error',
                    title: 'Unclosed string literal',
                    description: 'String literal is not properly closed with matching quotes.',
                    line: lineIndex + 1,
                    location: `Line ${lineIndex + 1}`
                });
            }

            // Count braces, brackets, and parentheses
            for (const char of line) {
                switch (char) {
                    case '{': braceCount++; break;
                    case '}': braceCount--; break;
                    case '[': bracketCount++; break;
                    case ']': bracketCount--; break;
                    case '(': parenCount++; break;
                    case ')': parenCount--; break;
                }
            }

            // Check for invalid characters in identifiers
            const identifierMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
            if (identifierMatch) {
                const identifier = identifierMatch[1];
                if (!this.validationPatterns.validIdentifier.test(identifier)) {
                    issues.push({
                        severity: 'error',
                        title: 'Invalid identifier',
                        description: `Identifier "${identifier}" contains invalid characters. Identifiers must start with a letter or underscore and contain only letters, numbers, and underscores.`,
                        line: lineIndex + 1,
                        location: `Line ${lineIndex + 1}`
                    });
                }
            }

            // Improved check for potentially unquoted strings
            // Skip this check for lines that contain valid HCL constructs
            if (line.includes('=') && !line.includes('==') && !line.includes('!=') &&
                !line.includes('<=') && !line.includes('>=')) {

                // More sophisticated pattern to avoid false positives
                // Skip if line contains JSON arrays, objects, or other valid constructs
                const skipPatterns = [
                    /=\s*\[/,           // JSON/HCL arrays: = [
                    /=\s*\{/,           // JSON/HCL objects: = {
                    /=\s*\$\{/,         // Terraform interpolation: = ${
                    /=\s*var\./,        // Terraform variables: = var.
                    /=\s*local\./,      // Terraform locals: = local.
                    /=\s*data\./,       // Terraform data sources: = data.
                    /=\s*resource\./,   // Terraform resources: = resource.
                    /=\s*module\./,     // Terraform modules: = module.
                    /=\s*true\s*$/,     // Boolean true
                    /=\s*false\s*$/,    // Boolean false
                    /=\s*null\s*$/,     // Null value
                    /=\s*-?\d+(\.\d+)?\s*$/, // Numbers
                    /=\s*"[^"]*"\s*$/,  // Already quoted strings
                    /^\s*#/,            // Comments
                    /^\s*\/\//          // Comments
                ];

                const shouldSkip = skipPatterns.some(pattern => pattern.test(line));

                if (!shouldSkip) {
                    // Look for assignment to unquoted values that might need quotes
                    const assignmentMatch = line.match(/=\s*([^"'\s\[\{\$][^,\]\}]*[^,\]\}\s])/);
                    if (assignmentMatch) {
                        const value = assignmentMatch[1].trim();

                        // Additional checks to avoid false positives
                        const validUnquotedPatterns = [
                            /^-?\d+(\.\d+)?$/,        // Numbers
                            /^(true|false)$/,         // Booleans
                            /^null$/,                 // Null
                            /^[a-zA-Z_][a-zA-Z0-9_]*$/, // Valid identifiers
                            /^\[.*\]$/,               // Arrays (basic check)
                            /^\{.*\}$/,               // Objects (basic check)
                            /^\$\{.*\}$/,             // Interpolations
                            /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/, // Resource references like datadog_dashboard.name
                            /^var\.[a-zA-Z_][a-zA-Z0-9_]*$/, // Variable references
                            /^local\.[a-zA-Z_][a-zA-Z0-9_]*$/, // Local references
                            /^data\.[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/, // Data source references
                            /^module\.[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/, // Module references
                        ];

                        const isValidUnquoted = validUnquotedPatterns.some(pattern => pattern.test(value));

                        if (!isValidUnquoted && value.length > 0) {
                            issues.push({
                                severity: 'warning',
                                title: 'Potentially unquoted string',
                                description: `Value "${value}" might need to be quoted if it's a string literal. If this is intentional (e.g., a reference or expression), you can ignore this warning.`,
                                line: lineIndex + 1,
                                location: `Line ${lineIndex + 1}`
                            });
                        }
                    }
                }
            }
        });

        // Check for unmatched braces, brackets, or parentheses
        if (braceCount !== 0) {
            issues.push({
                severity: 'error',
                title: 'Unmatched braces',
                description: `Found ${Math.abs(braceCount)} unmatched ${braceCount > 0 ? 'opening' : 'closing'} braces.`,
                location: 'Overall structure'
            });
        }

        if (bracketCount !== 0) {
            issues.push({
                severity: 'error',
                title: 'Unmatched brackets',
                description: `Found ${Math.abs(bracketCount)} unmatched ${bracketCount > 0 ? 'opening' : 'closing'} brackets.`,
                location: 'Overall structure'
            });
        }

        if (parenCount !== 0) {
            issues.push({
                severity: 'error',
                title: 'Unmatched parentheses',
                description: `Found ${Math.abs(parenCount)} unmatched ${parenCount > 0 ? 'opening' : 'closing'} parentheses.`,
                location: 'Overall structure'
            });
        }
    }

    validateTerraformStructure(hclContent, issues) {
        // Check for required resource block
        if (!hclContent.includes('resource "datadog_dashboard"')) {
            issues.push({
                severity: 'error',
                title: 'Missing dashboard resource',
                description: 'HCL must contain a datadog_dashboard resource block.',
                location: 'Overall structure'
            });
            return;
        }

        // Import blocks are not needed for this tool - skipping validation

        // Validate resource names
        const resourceMatches = hclContent.match(/resource\s+"([^"]+)"\s+"([^"]+)"/g);
        if (resourceMatches) {
            resourceMatches.forEach(match => {
                const parts = match.match(/resource\s+"([^"]+)"\s+"([^"]+)"/);
                if (parts) {
                    const resourceType = parts[1];
                    const resourceName = parts[2];

                    if (!this.validationPatterns.validResourceType.test(resourceType)) {
                        issues.push({
                            severity: 'error',
                            title: 'Invalid resource type',
                            description: `Resource type "${resourceType}" is not valid. Must be in format "provider_resource".`,
                            location: `Resource: ${resourceType}.${resourceName}`
                        });
                    }

                    if (!this.validationPatterns.validResourceName.test(resourceName)) {
                        issues.push({
                            severity: 'error',
                            title: 'Invalid resource name',
                            description: `Resource name "${resourceName}" is not valid. Must start with a letter and contain only letters, numbers, hyphens, and underscores.`,
                            location: `Resource: ${resourceType}.${resourceName}`
                        });
                    }
                }
            });
        }

        // Check for duplicate resource names
        const resourceNames = [];
        const duplicateCheck = hclContent.match(/resource\s+"[^"]+"\s+"([^"]+)"/g);
        if (duplicateCheck) {
            duplicateCheck.forEach(match => {
                const name = match.match(/resource\s+"[^"]+"\s+"([^"]+)"/)[1];
                if (resourceNames.includes(name)) {
                    issues.push({
                        severity: 'error',
                        title: 'Duplicate resource name',
                        description: `Resource name "${name}" is used multiple times. Each resource must have a unique name.`,
                        location: `Resource name: ${name}`
                    });
                } else {
                    resourceNames.push(name);
                }
            });
        }
    }

    validateDatadogProvider(hclContent, issues) {
        // Check for required dashboard fields
        if (this.validationRules && this.validationRules.required_dashboard_fields) {
            this.validationRules.required_dashboard_fields.forEach(field => {
                const fieldPattern = new RegExp(`${field}\\s*=`, 'i');
                if (!fieldPattern.test(hclContent)) {
                    issues.push({
                        severity: 'error',
                        title: `Missing required field: ${field}`,
                        description: `Dashboard resource must include the "${field}" field.`,
                        location: 'Dashboard resource'
                    });
                }
            });
        }

        // Validate layout_type values
        const layoutTypeMatch = hclContent.match(/layout_type\s*=\s*"([^"]+)"/);
        if (layoutTypeMatch) {
            const layoutType = layoutTypeMatch[1];
            if (this.validationRules && this.validationRules.valid_layout_types &&
                !this.validationRules.valid_layout_types.includes(layoutType)) {
                issues.push({
                    severity: 'error',
                    title: 'Invalid layout_type',
                    description: `Layout type "${layoutType}" is not valid. Must be one of: ${this.validationRules.valid_layout_types.join(', ')}.`,
                    location: 'Dashboard resource'
                });
            }
        }

        // Validate widget types
        const widgetDefinitions = hclContent.match(/(\w+)_definition\s*{/g);
        if (widgetDefinitions) {
            widgetDefinitions.forEach(definition => {
                const widgetType = definition.match(/(\w+)_definition/)[1];
                if (this.validationRules && this.validationRules.valid_widget_types &&
                    !this.validationRules.valid_widget_types.includes(widgetType)) {
                    issues.push({
                        severity: 'warning',
                        title: 'Unknown widget type',
                        description: `Widget type "${widgetType}" might not be supported by the Datadog provider.`,
                        location: `Widget: ${widgetType}_definition`
                    });
                }
            });
        }

        // Validate metric queries (basic check)
        const queryMatches = hclContent.match(/q\s*=\s*"([^"]+)"/g);
        if (queryMatches) {
            queryMatches.forEach(match => {
                const query = match.match(/q\s*=\s*"([^"]+)"/)[1];
                if (query.length < 3) {
                    issues.push({
                        severity: 'warning',
                        title: 'Suspiciously short metric query',
                        description: `Metric query "${query}" seems too short. Verify it's a valid Datadog metric query.`,
                        location: 'Widget request'
                    });
                }
            });
        }

        // Validate color values
        const colorMatches = hclContent.match(/(background_color|color)\s*=\s*"([^"]+)"/g);
        if (colorMatches) {
            colorMatches.forEach(match => {
                const parts = match.match(/(background_color|color)\s*=\s*"([^"]+)"/);
                const colorValue = parts[2];
                if (this.validationPatterns && this.validationPatterns.validColor &&
                    !this.validationPatterns.validColor.test(colorValue)) {
                    issues.push({
                        severity: 'warning',
                        title: 'Invalid color format',
                        description: `Color value "${colorValue}" should be a hex color (#RRGGBB) or a valid color name.`,
                        location: `Color field: ${parts[1]}`
                    });
                }
            });
        }

        // Check for placeholder values that need to be replaced
        const placeholderPatterns = [
            { pattern: /DASHBOARD_ID_PLACEHOLDER/, field: 'Dashboard ID' },
            { pattern: /imported_dashboard/, field: 'Resource name' },
            { pattern: /Imported Dashboard/, field: 'Dashboard title' },
        ];

        placeholderPatterns.forEach(({ pattern, field }) => {
            if (pattern.test(hclContent)) {
                issues.push({
                    severity: 'info',
                    title: `Consider using variables`,
                    description: `${field} appears to be hardcoded. Consider using Terraform variables for better reusability.`,
                    location: field
                });
            }
        });
    }

    validateBestPractices(hclContent, issues) {
        // Check for consistent indentation
        const lines = hclContent.split('\n');
        let expectedIndent = 0;
        let inconsistentIndentation = false;

        lines.forEach((line, index) => {
            if (line.trim() === '') return;

            const actualIndent = line.match(/^(\s*)/)[1].length;
            const trimmedLine = line.trim();

            if (trimmedLine.endsWith('{')) {
                expectedIndent += 2;
            } else if (trimmedLine === '}') {
                expectedIndent -= 2;
            }

            // Allow some flexibility in indentation
            if (Math.abs(actualIndent - expectedIndent) > 2 && !inconsistentIndentation) {
                issues.push({
                    severity: 'info',
                    title: 'Inconsistent indentation',
                    description: 'Consider using consistent 2-space indentation for better readability.',
                    line: index + 1,
                    location: `Line ${index + 1}`
                });
                inconsistentIndentation = true;
            }
        });

        // Check for long lines
        lines.forEach((line, index) => {
            if (line.length > 120) {
                issues.push({
                    severity: 'info',
                    title: 'Long line',
                    description: 'Consider breaking long lines for better readability (recommended: < 120 characters).',
                    line: index + 1,
                    location: `Line ${index + 1} (${line.length} characters)`
                });
            }
        });

        // Check for missing comments
        if (!hclContent.includes('#') && !hclContent.includes('//')) {
            issues.push({
                severity: 'info',
                title: 'No comments found',
                description: 'Consider adding comments to explain complex configurations.',
                location: 'Overall structure'
            });
        }

        // Check for hardcoded values that could be variables
        const hardcodedPatterns = [
            { pattern: /"[a-f0-9-]{36}"/, suggestion: 'Dashboard ID' },
            { pattern: /"prod|staging|dev"/i, suggestion: 'Environment' },
            { pattern: /"us-east-1|us-west-2|eu-west-1"/i, suggestion: 'Region' },
        ];

        hardcodedPatterns.forEach(({ pattern, suggestion }) => {
            if (pattern.test(hclContent)) {
                issues.push({
                    severity: 'info',
                    title: `Consider using variables`,
                    description: `${suggestion} appears to be hardcoded. Consider using Terraform variables for better reusability.`,
                    location: suggestion
                });
            }
        });
    }

    displayValidationResults(result) {
        const { isValid, issues, summary } = result;

        // Show validation panel
        this.validationPanel.style.display = 'block';

        // Update summary
        const summaryElement = this.validationPanel.querySelector('.validation-summary');
        const summaryClass = isValid ? 'valid' : (summary.errors > 0 ? 'invalid' : 'warning');
        summaryElement.className = `validation-summary ${summaryClass}`;

        let summaryText = '';
        if (isValid && summary.total === 0) {
            summaryText = '✅ HCL is valid with no issues found!';
        } else if (isValid) {
            summaryText = `✅ HCL is valid with ${summary.warnings + summary.infos} suggestions for improvement.`;
        } else {
            summaryText = `❌ HCL has ${summary.errors} error(s) that need to be fixed.`;
        }
        summaryElement.textContent = summaryText;

        // Update details
        const detailsElement = this.validationPanel.querySelector('.validation-details');

        if (issues.length === 0) {
            detailsElement.innerHTML = '<p>No validation issues found. Your HCL looks great! 🎉</p>';
        } else {
            let detailsHTML = '';

            // Group issues by severity
            const errorIssues = issues.filter(issue => issue.severity === 'error');
            const warningIssues = issues.filter(issue => issue.severity === 'warning');
            const infoIssues = issues.filter(issue => issue.severity === 'info');

            [
                { title: 'Errors', issues: errorIssues, class: 'error' },
                { title: 'Warnings', issues: warningIssues, class: 'warning' },
                { title: 'Suggestions', issues: infoIssues, class: 'info' }
            ].forEach(group => {
                if (group.issues.length > 0) {
                    detailsHTML += `<h4>${group.title} (${group.issues.length})</h4>`;
                    group.issues.forEach(issue => {
                        detailsHTML += `
                            <div class="validation-issue ${group.class}">
                                <div class="validation-issue-title">${issue.title}</div>
                                <div class="validation-issue-description">${issue.description}</div>
                                <div class="validation-issue-location">📍 ${issue.location}</div>
                            </div>
                        `;
                    });
                }
            });

            // Add statistics
            detailsHTML += `
                <div class="validation-stats">
                    <div class="validation-stat">
                        <div class="validation-stat-icon error">${summary.errors}</div>
                        <span>Errors</span>
                    </div>
                    <div class="validation-stat">
                        <div class="validation-stat-icon warning">${summary.warnings}</div>
                        <span>Warnings</span>
                    </div>
                    <div class="validation-stat">
                        <div class="validation-stat-icon info">${summary.infos}</div>
                        <span>Suggestions</span>
                    </div>
                    <div class="validation-stat">
                        <div class="validation-stat-icon success">${Math.max(0, 100 - summary.errors * 10 - summary.warnings * 5)}</div>
                        <span>Score</span>
                    </div>
                </div>
            `;

            detailsElement.innerHTML = detailsHTML;
        }

        // Scroll validation panel into view
        this.validationPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    displayValidationError(message) {
        // Show validation panel with error
        this.validationPanel.style.display = 'block';

        const summaryElement = this.validationPanel.querySelector('.validation-summary');
        summaryElement.className = 'validation-summary invalid';
        summaryElement.textContent = '❌ Validation Error';

        const detailsElement = this.validationPanel.querySelector('.validation-details');
        detailsElement.innerHTML = `
            <div class="validation-issue error">
                <div class="validation-issue-title">Validation Failed</div>
                <div class="validation-issue-description">${message}</div>
            </div>
        `;
    }

    generateLegacyRequests(requests) {
        let hcl = '';

        requests.forEach((request, index) => {
            if (this.hasValidRequestContent(request)) {
                hcl += `\n      request {\n`;

                // Add aggregator first if it exists (preserving original order)
                if (request.aggregator) {
                    hcl += `        aggregator = "${request.aggregator}"\n`;
                }

                // Legacy format uses q property directly
                if (request.q) {
                    hcl += `        q          = ${this.escapeHCLString(request.q)}\n`;
                } else if (request.queries && Array.isArray(request.queries)) {
                    // Convert modern queries to legacy q format
                    const query = request.queries[0];
                    if (query && query.query) {
                        hcl += `        q          = ${this.escapeHCLString(query.query)}\n`;
                    } else if (query && query.search && query.search.query) {
                        // For log queries, use the search query
                        hcl += `        q          = ${this.escapeHCLString(query.search.query)}\n`;
                    } else if (query && query.data_source === 'logs') {
                        // Handle log queries with compute aggregation
                        let logQuery = '';
                        if (query.compute && query.compute.aggregation) {
                            logQuery = `${query.compute.aggregation}:`;
                            if (query.compute.metric) {
                                logQuery += query.compute.metric;
                            }
                        }
                        if (query.search && query.search.query && !logQuery) {
                            logQuery = query.search.query;
                        } else if (query.search && query.search.query) {
                            logQuery += ` ${query.search.query}`;
                        }
                        if (logQuery) {
                            hcl += `        q          = ${this.escapeHCLString(logQuery)}\n`;
                        }
                    }
                }

                // Add other legacy request properties
                if (request.display_type) {
                    hcl += `        display_type   = "${request.display_type}"\n`;
                }

                if (request.on_right_yaxis !== undefined) {
                    hcl += `        on_right_yaxis = ${request.on_right_yaxis}\n`;
                }

                // Add conditional formats with hide_value preserved
                if (request.conditional_formats && Array.isArray(request.conditional_formats)) {
                    hcl += `\n`;
                    request.conditional_formats.forEach(format => {
                        hcl += `        conditional_formats {\n`;
                        if (format.comparator) hcl += `          comparator = "${format.comparator}"\n`;
                        if (format.hide_value !== undefined) hcl += `          hide_value = ${format.hide_value}\n`;
                        if (format.palette) hcl += `          palette    = "${format.palette}"\n`;
                        if (format.value !== undefined) hcl += `          value      = ${format.value}\n`;
                        hcl += `        }\n`;
                    });
                }

                if (request.style) {
                    hcl += `\n        style {\n`;
                    if (request.style.palette) hcl += `          palette    = "${request.style.palette}"\n`;
                    if (request.style.line_type) hcl += `          line_type  = "${request.style.line_type}"\n`;
                    if (request.style.line_width) hcl += `          line_width = "${request.style.line_width}"\n`;
                    hcl += `        }\n`;
                }

                hcl += `      }\n`;
            }
        });

        return hcl;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.datadogHCLGenerator = new DatadogHCLGenerator();

    // Add keyboard shortcut hints to the info section
    const infoSection = document.querySelector('.info-section');
    if (infoSection) {
        const shortcutsDetails = document.createElement('details');
        shortcutsDetails.innerHTML = `
            <summary>⌨️ Keyboard Shortcuts</summary>
            <ul>
                <li><kbd>Ctrl+K</kbd> / <kbd>Cmd+K</kbd> - Clear input</li>
                <li><kbd>Ctrl+L</kbd> / <kbd>Cmd+L</kbd> - Load sample dashboard</li>
                <li><kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd> - Validate HCL (when not in input field)</li>
                <li><kbd>Ctrl+Shift+F</kbd> / <kbd>Cmd+Shift+F</kbd> - Focus on input field</li>
                <li><kbd>Ctrl+Shift+Enter</kbd> / <kbd>Cmd+Shift+Enter</kbd> - Copy output</li>
                <li><kbd>Ctrl+Shift+S</kbd> / <kbd>Cmd+Shift+S</kbd> - Download file</li>
                <li><kbd>Esc</kbd> - Close validation panel</li>
            </ul>
        `;
        infoSection.appendChild(shortcutsDetails);

        // Add sample data button
        const sampleButton = document.createElement('button');
        sampleButton.className = 'btn btn-secondary';
        sampleButton.textContent = '📊 Load Sample Dashboard';
        sampleButton.onclick = () => window.datadogHCLGenerator.loadSampleData();

        const controls = document.querySelector('.input-controls');
        if (controls) {
            controls.appendChild(sampleButton);
        }
    }

    // Console welcome message
    console.log(`
🐕 Datadog HCL Generator v${window.datadogHCLGenerator.getVersion()}
Privacy-first dashboard converter
Made with ❤️ for DevOps teams

API: window.datadogHCLGenerator.getStats()
    `);
});
