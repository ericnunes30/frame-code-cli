name: Issue Triage Agent

on:
  issues:
    types: [opened, reopened]

jobs:
  issue-triage:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Verify tools installation
        run: |
          echo "Verifying installed tools..."
          echo "Node.js version:"
          node --version
          echo "npm version:"
          npm --version
          echo "frame-code version:"
          frame-code --version
          echo "✅ All tools are already installed in the container"

      - name: Extract issue information
        id: issue-info
        run: |
          echo "Issue Number: ${{ github.event.issue.number }}"
          echo "Issue Title: ${{ github.event.issue.title }}"
          echo "Issue Body: ${{ github.event.issue.body }}"
          echo "Issue Labels: ${{ github.event.issue.labels.*.name }}"
          echo "Issue Author: ${{ github.event.issue.user.login }}"
          
          # Save issue data to JSON file for agent processing
          cat > issue-data.json << EOF
          {
            "number": ${{ github.event.issue.number }},
            "title": "${{ github.event.issue.title }}",
            "body": "${{ github.event.issue.body }}",
            "author": "${{ github.event.issue.user.login }}",
            "labels": ${{ toJSON(github.event.issue.labels.*.name) }},
            "created_at": "${{ github.event.issue.created_at }}",
            "url": "${{ github.event.issue.html_url }}"
          }
          EOF

      - name: Run Issue Triage Agent
        env:
          LLM_PROVIDER: 'openai-compatible'
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_BASE_URL: 'https://openrouter.ai/api/v1'
          LLM_DEFAULT_MODEL: 'qwen/qwen3-coder:free'
          LLM_MAX_TOKENS: '3000'
          LLM_TEMPERATURE: '0.7'
          LLM_MAX_OUTPUT_TOKENS: '240000'
          COMPRESSION_ENABLED: 'true'
          COMPRESSION_THRESHOLD: '0.8'
          COMPRESSION_MAX_COUNT: '5'
          COMPRESSION_MAX_TOKENS: '600'
          COMPRESSION_MODEL: 'qwen/qwen3-coder:free'
          COMPRESSION_LOGGING: 'true'
          COMPRESSION_PERSIST: 'true'
          MCP_TOOLS_ENABLED: 'false'
          AGENT_MODE: 'autonomous'
          DEBUG: 'false'
        run: |
          echo "Setting up agent skills..."
          if [ -d "/tmp/frame-code-cli/.code-skills" ]; then
            cp -r /tmp/frame-code-cli/.code-skills .code-skills
            echo "✅ Skills copied to $(pwd)/.code-skills"
          else
             echo "⚠️ Skills not found in /tmp/frame-code-cli. Agent might be limited."
          fi

          echo "Starting issue triage agent..."
          
          # Check if LLM API key is available
          if [ -z "$LLM_API_KEY" ]; then
            echo "ERROR: LLM_API_KEY is not set. Please add it to repository secrets."
            exit 1
          fi
          # Create triage prompt for the agent
          cat > triage-prompt.md << EOF
          # Issue Triage Task
          
          Analyze the following GitHub issue and assign a priority level from P0 to P3:
          
          **Priority Levels:**
          - **P0 (Extremely High)**: Critical bugs affecting production, security vulnerabilities, complete system outages
          - **P1 (High)**: Significant bugs affecting core functionality, major performance issues
          - **P2 (Medium)**: Regular bugs, feature requests with clear business value
          - **P3 (Low)**: Minor issues, cosmetic problems, nice-to-have features
          
          **Issue Information:**
          \`\`\`json
          $(cat issue-data.json)
          \`\`\`
          
          **Instructions:**
          1. Analyze the issue content and impact.
          2. USE YOUR TOOLS to assign the appropriate priority label (P0-P3) directly to the issue.
          3. USE YOUR TOOLS to add a comment on the issue with your justification.
          4. If the issue is critical (P0/P1), ensure your comment highlights this clearly.
          
          **Available Priority Labels:**
          - P0: Critical/Security (Extremely High)
          - P1: Core Functionality (High)
          - P2: Regular Bug/Feature (Medium)
          - P3: Minor/Cosmetic (Low)
          
          DO NOT RETURN JSON. ACT ON THE ISSUE DIRECTLY.
          EOF
          
          # Run the frame-code agent in autonomous mode
          # The agent will use MCP tools/skills to interact with GitHub
          timeout 300 frame-code autonomous --input-file triage-prompt.md --output-file agent-log.txt
          
          echo "Agent execution completed. Full log:"
          cat agent-log.txt
