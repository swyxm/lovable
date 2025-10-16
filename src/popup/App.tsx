import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import DrawingCanvas from './DrawingCanvas';
import './App.css';

interface ConversationStep {
  type: 'input' | 'clarification' | 'summary' | 'assistant' | 'user' | 'options' | 'drawing' | 'file-upload';
  content: string;
  options?: string[];
  visualCards?: VisualCard[];
  placeholder?: string;
}

interface VisualCard {
  id: string;
  title: string;
  color?: string;
  emoji?: string;
  description?: string;
}

interface PromptData {
  theme: string;
  color_scheme: string;
  features: string[];
  tone: string;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [conversation, setConversation] = useState<ConversationStep[]>([
    {
      type: 'assistant',
      content: "Hi! I'm your friendly dragon helper! 🐉 What would you like to create today?",
      options: ['Tell me with words', 'Draw me a picture', 'Show me an image', 'Tell me with your voice']
    }
  ]);
  const [userInput, setUserInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [finalPromptData, setFinalPromptData] = useState<PromptData | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<Partial<PromptData>>({});

  const handleOptionSelect = (option: string) => {
    let newStep: ConversationStep;

    switch (option) {
      case 'Tell me with words':
        newStep = {
          type: 'input',
          content: 'Great! Type your idea below. What kind of website would you like to create?'
        };
        break;
      case 'Draw me a picture':
        setShowDrawingCanvas(true);
        return;
      case 'Show me an image':
        setShowFileUpload(true);
        return;
      case 'Tell me with your voice':
        startVoiceInput();
        return;
      default:
        newStep = {
          type: 'clarification',
          content: `Awesome choice! Let's work on your ${currentPrompt.theme || 'idea'} together.`,
          options: ['Choose colors', 'Add features', 'See summary']
        };
    }

    setConversation([...conversation, newStep]);
    setCurrentStep(currentStep + 1);
  };

  const handleTextInput = () => {
    if (userInput.trim()) {
      // Simulate AI interpretation
      const interpretedTheme = interpretInput(userInput);
      setCurrentPrompt({ ...currentPrompt, theme: interpretedTheme });

      const newStep: ConversationStep = {
        type: 'clarification',
        content: `I think you want to create a ${interpretedTheme} website! That sounds amazing! What colors would you like?`,
        visualCards: [
          { id: 'bright', title: 'Bright & Fun', color: '#ff6b6b', emoji: '🌈' },
          { id: 'calm', title: 'Calm & Cool', color: '#4ecdc4', emoji: '🌊' },
          { id: 'mysterious', title: 'Dark & Mysterious', color: '#2c3e50', emoji: '🌙' },
          { id: 'natural', title: 'Earth & Nature', color: '#27ae60', emoji: '🌱' }
        ]
      };
      setConversation([...conversation, newStep]);
      setCurrentStep(currentStep + 1);
      setUserInput('');
    }
  };

  const handleVisualCardSelect = (card: VisualCard) => {
    setCurrentPrompt({ ...currentPrompt, color_scheme: card.title });

    const newStep: ConversationStep = {
      type: 'clarification',
      content: `Perfect! ${card.title} colors will look great! What features should your website have?`,
      visualCards: [
        { id: 'stories', title: 'Story Pages', emoji: '📚' },
        { id: 'gallery', title: 'Photo Gallery', emoji: '🖼️' },
        { id: 'games', title: 'Fun Games', emoji: '🎮' },
        { id: 'facts', title: 'Cool Facts', emoji: '📋' }
      ]
    };
    setConversation([...conversation, newStep]);
    setCurrentStep(currentStep + 1);
  };

  const handleFeatureSelect = (feature: VisualCard) => {
    const currentFeatures = currentPrompt.features || [];
    setCurrentPrompt({
      ...currentPrompt,
      features: [...currentFeatures, feature.title]
    });

    // Generate final summary
    generateFinalPrompt();
  };

  const generateFinalPrompt = () => {
    const finalPrompt: PromptData = {
      theme: currentPrompt.theme || 'Creative',
      color_scheme: currentPrompt.color_scheme || 'Bright & Fun',
      features: currentPrompt.features || ['Story Pages'],
      tone: 'Playful and adventurous'
    };

    setFinalPromptData(finalPrompt);
    setShowExportModal(true);

    // Save to storage
    chrome.runtime.sendMessage({
      action: 'saveConversation',
      conversation: finalPrompt
    });
  };

  const copyToClipboard = async () => {
    if (!finalPromptData) return;

    const promptText = `Create a ${finalPromptData.theme} website with ${finalPromptData.color_scheme} colors, featuring ${finalPromptData.features.join(', ')}. The tone should be ${finalPromptData.tone}.`;

    try {
      await navigator.clipboard.writeText(promptText);
      alert('✅ Prompt copied to clipboard! You can now paste it into Lovable!');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = promptText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Prompt copied to clipboard! You can now paste it into Lovable!');
    }
  };

  const interpretInput = (input: string): string => {
    // Simple AI interpretation - in real implementation, this would call an LLM
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('dragon')) return 'Dragon';
    if (lowerInput.includes('space')) return 'Space';
    if (lowerInput.includes('animal')) return 'Animal';
    if (lowerInput.includes('game')) return 'Gaming';
    if (lowerInput.includes('music')) return 'Music';
    return 'Creative';
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
        // Auto-submit after voice input
        setTimeout(() => handleTextInput(), 1000);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Voice input is not supported in this browser. Please try typing instead!');
    }
  };

  const handleDrawingComplete = (dataUrl: string) => {
    setShowDrawingCanvas(false);
    // Simulate AI vision interpretation
    const newStep: ConversationStep = {
      type: 'clarification',
      content: 'I can see your drawing! It looks like you drew something creative. What colors would you like for your website?',
      visualCards: [
        { id: 'bright', title: 'Bright & Fun', color: '#ff6b6b', emoji: '🌈' },
        { id: 'calm', title: 'Calm & Cool', color: '#4ecdc4', emoji: '🌊' },
        { id: 'mysterious', title: 'Dark & Mysterious', color: '#2c3e50', emoji: '🌙' },
        { id: 'natural', title: 'Earth & Nature', color: '#27ae60', emoji: '🌱' }
      ]
    };
    setConversation([...conversation, newStep]);
    setCurrentStep(currentStep + 1);
    setCurrentPrompt({ ...currentPrompt, theme: 'Custom Drawing' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Simulate AI vision interpretation
        const newStep: ConversationStep = {
          type: 'clarification',
          content: 'I can see your image! It looks interesting. What colors would you like for your website?',
          visualCards: [
            { id: 'bright', title: 'Bright & Fun', color: '#ff6b6b', emoji: '🌈' },
            { id: 'calm', title: 'Calm & Cool', color: '#4ecdc4', emoji: '🌊' },
            { id: 'mysterious', title: 'Dark & Mysterious', color: '#2c3e50', emoji: '🌙' },
            { id: 'natural', title: 'Earth & Nature', color: '#27ae60', emoji: '🌱' }
          ]
        };
        setConversation([...conversation, newStep]);
        setCurrentStep(currentStep + 1);
        setCurrentPrompt({ ...currentPrompt, theme: 'Image Upload' });
      };
      reader.readAsDataURL(file);
    }
    setShowFileUpload(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>LovaBridge</h1>
        <p>Let's build something amazing together! 🎨✨</p>
      </header>

      <main className="app-content">
        <div className="conversation">
          {conversation.slice(0, currentStep + 1).map((step, index) => (
            <div key={index} className={`conversation-step ${index === currentStep ? 'active' : ''}`}>
              {step.type === 'assistant' && (
                <div className="assistant-message">
                  <p>{step.content}</p>
                </div>
              )}
              {step.type === 'user' && (
                <div className="user-message">
                  <p>{step.content}</p>
                </div>
              )}
              {step.type === 'options' && (
                <div className="options-container">
                  {step.options?.map((option, i) => (
                    <button
                      key={i}
                      className="option-button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={isListening}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {step.type === 'input' && (
                <div className="input-container">
                  <input
                    type="text"
                    className="text-input"
                    placeholder={step.placeholder || 'Type your answer here...'}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTextInput()}
                    disabled={isListening}
                  />
                  <div className="input-buttons">
                    <button
                      className={`input-button ${isListening ? 'listening' : ''}`}
                      onClick={startVoiceInput}
                      disabled={isListening}
                      aria-label={isListening ? 'Listening...' : 'Use voice input'}
                    >
                      {isListening ? '🎤 Listening...' : '🎤'}
                    </button>
                    <button
                      className="input-button submit-button"
                      onClick={handleTextInput}
                      disabled={!userInput.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
              {step.type === 'drawing' && (
                <div className="drawing-container">
                  <button
                    className="option-button"
                    onClick={() => setShowDrawingCanvas(true)}
                  >
                    🎨 Open Drawing Board
                  </button>
                </div>
              )}
              {step.type === 'file-upload' && (
                <div className="file-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file-input"
                    id="image-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="image-upload" className="option-button">
                    📷 Choose an Image
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="app-footer">
        <p>💝 Made with love for amazing creators like you!</p>
      </footer>

      {showDrawingCanvas && (
        <div className="modal-overlay" onClick={() => setShowDrawingCanvas(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawing-canvas-container">
              <canvas id="drawing-canvas" width="400" height="400"></canvas>
              <button
                className="close-modal-button"
                onClick={() => setShowDrawingCanvas(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showFileUpload && (
        <div className="modal-overlay" onClick={() => setShowFileUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="file-upload-container">
              <h3>📸 Upload Your Image</h3>
              <p>Show me a picture of your idea!</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="file-input"
                id="image-upload"
              />
              <button
                className="close-modal-button"
                onClick={() => setShowFileUpload(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && finalPromptData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-modal-button" 
              onClick={() => setShowExportModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="export-modal">
              <h2>🎉 All Set!</h2>
              <div className="prompt-preview">
                <p>Here's what I'll create for you:</p>
                <div className="prompt-details">
                  <p><strong>Theme:</strong> {finalPromptData.theme}</p>
                  <p><strong>Colors:</strong> {finalPromptData.color_scheme}</p>
                  <p><strong>Features:</strong> {finalPromptData.features.join(', ')}</p>
                  <p><strong>Style:</strong> {finalPromptData.tone}</p>
                </div>
              </div>
              <div className="export-actions">
                <button 
                  className="export-button primary"
                  onClick={copyToClipboard}
                >
                  📋 Copy to Clipboard
                </button>
                <button 
                  className="export-button secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Make Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
