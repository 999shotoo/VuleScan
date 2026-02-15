# Image Attachment Debugging Guide

## What We've Implemented

### Client-Side (mainchat.tsx)
- ✅ File upload with drag & drop support
- ✅ Converts uploaded files to `experimental_attachments` format
- ✅ Sends attachments with proper data URL format
- ✅ Debug logging for attachment details

### Server-Side (api.ts)
- ✅ Comprehensive debug logging for received messages
- ✅ Processes `experimental_attachments` from client
- ✅ Converts image attachments to AI SDK format
- ✅ Handles both new attachments and chat history

### UI Components
- ✅ **Persona** avatars for user/assistant messages
- ✅ **Image** component for displaying uploaded images
- ✅ **Task** components for tool calls/results
- ✅ **TaskItemFile** for file attachment display
- ✅ **CodeBlock** support (via Streamdown in MessageResponse)

## How to Test

### 1. Start the Dev Server
```powershell
cd c:\myfile\projects\Final-Year-Project\VuleScan\apps\desktop
npm run dev
```

### 2. Upload an Image
1. Click the paperclip icon or drag & drop an image
2. Type a message like "What's in this image?"
3. Send the message

### 3. Check Console Logs

**Client Console (Browser DevTools):**
```
Sending message with attachments: {
  hasText: true,
  attachmentsCount: 1,
  attachments: [
    {
      name: "screenshot.png",
      contentType: "image/png",
      url: "data:image/png;base64,iVBORw0KG..."
    }
  ],
  model: "kwaipilot/kat-coder-pro-v1"
}
```

**Server Console (Terminal):**
```
========== NEW CHAT REQUEST ==========
Received messages: 1
Full request body: {...}
Last message: {...}

--- Processing message 0 (role: user) ---
Message keys: ["role", "parts", "experimental_attachments"]
Has experimental_attachments: true
Has parts: true
Found 1 experimental_attachments
Attachment 0: {
  name: "screenshot.png",
  contentType: "image/png",
  hasUrl: true,
  urlType: "data URL",
  urlLength: 123456
}
✓ Added image attachment 0 to content
Final content parts: 2
  Part 0: text
  Part 1: image (has image data)

Formatted messages for AI: [
  {
    "role": "user",
    "content": [
      { "type": "text", "text": "What's in this image?" },
      { "type": "image", "image": "data:image/png;base64,..." }
    ]
  }
]
```

## Troubleshooting

### Issue: AI says "no attachments received"

**Check 1: Client sends attachments**
- Look for `Sending message with attachments:` in browser console
- Verify `attachmentsCount > 0`
- Verify `url` starts with `data:image/`

**Check 2: Server receives attachments**
- Look for `Found X experimental_attachments` in terminal
- Look for `✓ Added image attachment` messages
- Check `Final content parts` includes image parts

**Check 3: AI receives attachments**
- Look for `Formatted messages for AI:` in terminal
- Verify the content array has `{ "type": "image", "image": "data:..." }`

### Issue: Image not displayed in UI

**Check:**
- Message parts should include `{ type: "image", image: "data:..." }`
- Image component props: `base64` and `mediaType` are correctly extracted
- Browser can render the data URL (paste in address bar)

### Issue: Model doesn't support images

**Solution:**
Switch to a vision-capable model:
- ✅ `openai/gpt-4o`
- ✅ `openai/gpt-4-turbo`
- ✅ `anthropic/claude-sonnet-4.5`
- ✅ `anthropic/claude-opus-4.6`
- ✅ `google/gemini-2.5-flash`
- ✅ `google/gemini-3-flash`

## AI Elements Components Available

### Already Integrated
- **Persona** - Animated avatars with states (idle, thinking, speaking)
- **Image** - Display base64 images
- **Task, TaskTrigger, TaskContent, TaskItem** - Collapsible tasks
- **TaskItemFile** - File attachment display
- **CodeBlock** - Auto-rendered via Streamdown in MessageResponse

### Available (Not Yet Integrated)
- **Agent** - Agent interactions
- **Artifact** - Generated artifacts
- **ChainOfThought** - AI reasoning display
- **Sources** - Citations and sources
- **Reasoning** - Detailed thinking process
- **Tool** - Tool usage display
- **Terminal** - Terminal output
- **Snippet** - Code snippets
- **Plan** - Multi-step plans
- **Checkpoint** - Progress checkpoints

## API Models Support

All 100+ models use Vercel AI Gateway with automatic routing:
- Format: `provider/model-name`
- Example: `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`
- No setup required - just use the model string

## Next Steps

Once image attachments are working:
1. Test with different image types (PNG, JPG, GIF)
2. Test with multiple images at once
3. Test with PDFs and text files
4. Implement additional AI Elements components as needed
5. Add image analysis features (OCR, object detection, etc.)
