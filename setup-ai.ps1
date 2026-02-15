#!/usr/bin/env pwsh
# VuleScan AI Chat - Quick Setup Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "VuleScan AI Chat Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to desktop app
Write-Host "📂 Navigating to desktop app directory..." -ForegroundColor Yellow
Set-Location "apps/desktop"

# Install dependencies
Write-Host "📦 Installing AI provider packages..." -ForegroundColor Yellow
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""

# Check for API keys
Write-Host "🔑 Checking API keys..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    $hasOpenAI = $envContent -match "OPENAI_API_KEY=(?!your_openai_api_key_here)"
    $hasAnthropic = $envContent -match "ANTHROPIC_API_KEY=(?!your_anthropic_api_key_here)"
    $hasGoogle = $envContent -match "GOOGLE_API_KEY=(?!your_google_api_key_here)"
    
    if (-not ($hasOpenAI -or $hasAnthropic -or $hasGoogle)) {
        Write-Host ""
        Write-Host "⚠️  WARNING: No API keys configured!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please edit apps/desktop/.env and add your API keys:" -ForegroundColor Yellow
        Write-Host "  • OpenAI: https://platform.openai.com/api-keys" -ForegroundColor Cyan
        Write-Host "  • Anthropic: https://console.anthropic.com/" -ForegroundColor Cyan
        Write-Host "  • Google AI: https://aistudio.google.com/app/apikey" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "✅ API keys found:" -ForegroundColor Green
        if ($hasOpenAI) { Write-Host "  ✓ OpenAI" -ForegroundColor Green }
        if ($hasAnthropic) { Write-Host "  ✓ Anthropic" -ForegroundColor Green }
        if ($hasGoogle) { Write-Host "  ✓ Google AI" -ForegroundColor Green }
        Write-Host ""
    }
} else {
    Write-Host "⚠️  .env file not found! Creating from example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "Please edit apps/desktop/.env and add your API keys." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete! 🎉" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Yellow
Write-Host "  AI_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
