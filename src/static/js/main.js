import { MultimodalLiveClient } from './core/websocket-client.js';
import { AudioStreamer } from './audio/audio-streamer.js';
import { AudioRecorder } from './audio/audio-recorder.js';
import { CONFIG } from './config/config.js';
import { Logger } from './utils/logger.js';
import { VideoManager } from './video/video-manager.js';
import { ScreenRecorder } from './video/screen-recorder.js';

/**
 * @fileoverview Main entry point for the application.
 * Initializes and manages the UI, audio, video, and WebSocket interactions.
 */

// DOM Elements
const logsContainer = document.getElementById('logs-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const micIcon = document.getElementById('mic-icon');
const audioVisualizer = document.getElementById('audio-visualizer');
const connectButton = document.getElementById('connect-button');
const cameraButton = document.getElementById('camera-button');
const cameraIcon = document.getElementById('camera-icon');
const stopVideoButton = document.getElementById('stop-video');
const screenButton = document.getElementById('screen-button');
const screenIcon = document.getElementById('screen-icon');
const screenContainer = document.getElementById('screen-container');
const screenPreview = document.getElementById('screen-preview');
const inputAudioVisualizer = document.getElementById('input-audio-visualizer');
const apiKeyInput = document.getElementById('api-key');
const voiceSelect = document.getElementById('voice-select');
const fpsInput = document.getElementById('fps-input');
const configToggle = document.getElementById('config-toggle');
const configContainer = document.getElementById('config-container');
const systemInstructionInput = document.getElementById('system-instruction');
systemInstructionInput.value = CONFIG.SYSTEM_INSTRUCTION.TEXT;
const applyConfigButton = document.getElementById('apply-config');
const responseTypeSelect = document.getElementById('response-type-select');

// Load saved values from localStorage
const savedApiKey = localStorage.getItem('gemini_api_key');
const savedVoice = localStorage.getItem('gemini_voice');
const savedFPS = localStorage.getItem('video_fps');
const savedSystemInstruction = localStorage.getItem('system_instruction');
const savedLanguage = localStorage.getItem('preferred_language');

// 设置初始语言
let currentLang = savedLanguage || 'zh'; // 默认使用中文

if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}
if (savedVoice) {
    voiceSelect.value = savedVoice;
}

if (savedFPS) {
    fpsInput.value = savedFPS;
}
if (savedSystemInstruction) {
    systemInstructionInput.value = savedSystemInstruction;
    CONFIG.SYSTEM_INSTRUCTION.TEXT = savedSystemInstruction;
}

// Handle configuration panel toggle
configToggle.addEventListener('click', () => {
    configContainer.classList.toggle('active');
    configToggle.classList.toggle('active');
});

applyConfigButton.addEventListener('click', () => {
    configContainer.classList.toggle('active');
    configToggle.classList.toggle('active');
});

// State variables
let isRecording = false;
let audioStreamer = null;
let audioCtx = null;
let isConnected = false;
let audioRecorder = null;
let isVideoActive = false;
let videoManager = null;
let isScreenSharing = false;
let screenRecorder = null;
let isUsingTool = false;

// Multimodal Client
const client = new MultimodalLiveClient();

// Language translations
const translations = {
    en: {
        title: "Gemini 2.0 Flash Multimodal Live API Client",
        apiKeyPlaceholder: "Please Input Gemini API Key",
        soundLabel: "Sound:",
        responseTypeLabel: "Response Type:",
        videoFPSLabel: "Video FPS:",
        fpsHelp: "Higher FPS need more network bandwidth",
        systemInstructionPlaceholder: "Enter custom system instructions...",
        confirmButton: "Confirm",
        connectButton: "Connect",
        disconnectButton: "Disconnect",
        messageInputPlaceholder: "Enter message...",
        sendButton: "Send",
        inputAudioLabel: "Input Audio",
        outputAudioLabel: "Output Audio",
        stopVideo: "Stop Video",
        voiceOptions: {
            puckMale: "Puck (Male)",
            charonMale: "Charon (Male)",
            fenrirMale: "Fenrir (Male)",
            koreFemale: "Kore (Female)",
            aoedeFemale: "Aoede (Female)"
        },
        responseTypes: {
            text: "Text",
            audio: "Audio"
        },
        systemMessages: {
            micStarted: "Microphone started",
            micStopped: "Microphone stopped",
            pleaseInputKey: "Please input API Key",
            connected: "Connected to Gemini 2.0 Flash Multimodal Live API",
            disconnected: "Disconnected from server",
            wsOpened: "WebSocket connection opened",
            wsClosed: "WebSocket connection closed (code {code})",
            setupComplete: "Setup complete",
            turnComplete: "Turn complete",
            cameraStarted: "Camera started",
            cameraStopped: "Camera stopped",
            screenStarted: "Screen sharing started",
            screenStopped: "Screen sharing stopped",
            modelInterrupted: "Model interrupted",
            errorProcessingAudio: "Error processing audio",
            connectionError: "Connection error",
            serverError: "Server error",
            applicationError: "Application error",
            unexpectedError: "Unexpected error"
        },
        labels: {
            inputAudio: "Input Audio",
            outputAudio: "Output Audio"
        }
    },
    zh: {
        title: "Gemini 2.0 实时多模态API客户端",
        apiKeyPlaceholder: "请输入Gemini API密钥",
        soundLabel: "声音：",
        responseTypeLabel: "响应类型：",
        videoFPSLabel: "视频帧率：",
        fpsHelp: "更高的帧率需要更多的网络带宽",
        systemInstructionPlaceholder: "输入自定义系统指令...",
        confirmButton: "确认",
        connectButton: "连接",
        disconnectButton: "断开连接",
        messageInputPlaceholder: "输入消息...",
        sendButton: "发送",
        inputAudioLabel: "输入音频",
        outputAudioLabel: "输出音频",
        stopVideo: "停止视频",
        voiceOptions: {
            puckMale: "帕克（男声）",
            charonMale: "卡戎（男声）",
            fenrirMale: "芬里尔（男声）",
            koreFemale: "科瑞（女声）",
            aoedeFemale: "奥伊德（女声）"
        },
        responseTypes: {
            text: "文本",
            audio: "音频"
        },
        systemMessages: {
            micStarted: "麦克风已启动",
            micStopped: "麦克风已停止",
            pleaseInputKey: "请输入API密钥",
            connected: "已连接到Gemini 2.0实时多模态API",
            disconnected: "已断开服务器连接",
            wsOpened: "WebSocket连接已打开",
            wsClosed: "WebSocket连接已关闭（代码：{code}）",
            setupComplete: "设置完成",
            turnComplete: "回合完成",
            cameraStarted: "相机已启动",
            cameraStopped: "相机已停止",
            screenStarted: "屏幕共享已启动",
            screenStopped: "屏幕共享已停止",
            modelInterrupted: "模型已中断",
            errorProcessingAudio: "处理音频时出错",
            connectionError: "连接错误",
            serverError: "服务器错误",
            applicationError: "应用程序错误",
            unexpectedError: "意外错误"
        },
        labels: {
            inputAudio: "输入音频",
            outputAudio: "输出音频"
        }
    }
};

// Language toggle button click handler
const langToggleButton = document.getElementById('lang-toggle');
langToggleButton.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    localStorage.setItem('preferred_language', currentLang); // 保存语言偏好
    updateUILanguage();
    langToggleButton.classList.toggle('active');
});

// Initial language setup
updateUILanguage();

// 更新系统指令的默认文本
const defaultSystemInstructions = {
    en: "You are my helpful assistant. You can see and hear me, and respond with voice and text. If you are asked about things you do not know, you can use the google search tool to find the answer.",
    zh: "你是我的智能助手。你可以看到和听到我，并且可以用语音和文字回应。如果被问到你不知道的事情，你可以使用谷歌搜索工具来寻找答案。"
};

// 根据当前语言设置系统指令
function updateSystemInstruction() {
    if (!systemInstructionInput.value) {
        systemInstructionInput.value = defaultSystemInstructions[currentLang];
        CONFIG.SYSTEM_INSTRUCTION.TEXT = defaultSystemInstructions[currentLang];
    }
}

// 在语言切换时更新系统指令
langToggleButton.addEventListener('click', () => {
    updateSystemInstruction();
});

// 初始化时设置系统指令
updateSystemInstruction();

/**
 * Logs a message to the UI.
 * @param {string} message - The message to log.
 * @param {string} [type='system'] - The type of the message (system, user, ai).
 */
function logMessage(message, type = 'system') {
    const t = translations[currentLang];
    let displayMessage = message;

    // 如果是系统消息，尝试翻译
    if (type === 'system' && t.systemMessages) {
        const systemMessages = t.systemMessages;
        // 遍历所有系统消息，查找匹配项
        for (const [key, value] of Object.entries(systemMessages)) {
            if (message.includes(translations.en.systemMessages[key])) {
                displayMessage = value;
                break;
            }
        }
    }

    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', type);

    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    timestamp.textContent = new Date().toLocaleTimeString();
    logEntry.appendChild(timestamp);

    const emoji = document.createElement('span');
    emoji.classList.add('emoji');
    switch (type) {
        case 'system':
            emoji.textContent = '⚙️';
            break;
        case 'user':
            emoji.textContent = '🫵';
            break;
        case 'ai':
            emoji.textContent = '🤖';
            break;
    }
    logEntry.appendChild(emoji);

    const messageText = document.createElement('span');
    messageText.textContent = displayMessage;
    logEntry.appendChild(messageText);

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

/**
 * Updates the microphone icon based on the recording state.
 */
function updateMicIcon() {
    micIcon.textContent = isRecording ? 'mic_off' : 'mic';
    micButton.style.backgroundColor = isRecording ? '#ea4335' : '#4285f4';
}

/**
 * Updates the audio visualizer based on the audio volume.
 * @param {number} volume - The audio volume (0.0 to 1.0).
 * @param {boolean} [isInput=false] - Whether the visualizer is for input audio.
 */
function updateAudioVisualizer(volume, isInput = false) {
    const visualizer = isInput ? inputAudioVisualizer : audioVisualizer;
    const audioBar = visualizer.querySelector('.audio-bar') || document.createElement('div');
    
    if (!visualizer.contains(audioBar)) {
        audioBar.classList.add('audio-bar');
        visualizer.appendChild(audioBar);
    }
    
    audioBar.style.width = `${volume * 100}%`;
    if (volume > 0) {
        audioBar.classList.add('active');
    } else {
        audioBar.classList.remove('active');
    }
}

/**
 * Initializes the audio context and streamer if not already initialized.
 * @returns {Promise<AudioStreamer>} The audio streamer instance.
 */
async function ensureAudioInitialized() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (!audioStreamer) {
        audioStreamer = new AudioStreamer(audioCtx);
        await audioStreamer.addWorklet('vumeter-out', 'js/audio/worklets/vol-meter.js', (ev) => {
            updateAudioVisualizer(ev.data.volume);
        });
    }
    return audioStreamer;
}

/**
 * Handles the microphone toggle. Starts or stops audio recording.
 * @returns {Promise<void>}
 */
async function handleMicToggle() {
    if (!isRecording) {
        try {
            await ensureAudioInitialized();
            audioRecorder = new AudioRecorder();
            
            const inputAnalyser = audioCtx.createAnalyser();
            inputAnalyser.fftSize = 256;
            const inputDataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
            
            await audioRecorder.start((base64Data) => {
                if (isUsingTool) {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data,
                        interrupt: true     // Model isn't interruptable when using tools, so we do it manually
                    }]);
                } else {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Data
                    }]);
                }
                
                inputAnalyser.getByteFrequencyData(inputDataArray);
                const inputVolume = Math.max(...inputDataArray) / 255;
                updateAudioVisualizer(inputVolume, true);
            });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(inputAnalyser);
            
            await audioStreamer.resume();
            isRecording = true;
            Logger.info('Microphone started');
            logMessage('Microphone started', 'system');
            updateMicIcon();
        } catch (error) {
            Logger.error('Microphone error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isRecording = false;
            updateMicIcon();
        }
    } else {
        if (audioRecorder && isRecording) {
            audioRecorder.stop();
        }
        isRecording = false;
        logMessage('Microphone stopped', 'system');
        updateMicIcon();
        updateAudioVisualizer(0, true);
    }
}

/**
 * Resumes the audio context if it's suspended.
 * @returns {Promise<void>}
 */
async function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

/**
 * Connects to the WebSocket server.
 * @returns {Promise<void>}
 */
async function connectToWebsocket() {
    if (!apiKeyInput.value) {
        logMessage('Please input API Key', 'system');
        return;
    }

    // Save values to localStorage
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
    localStorage.setItem('gemini_voice', voiceSelect.value);
    localStorage.setItem('system_instruction', systemInstructionInput.value);

    const config = {
        model: CONFIG.API.MODEL_NAME,
        generationConfig: {
            responseModalities: responseTypeSelect.value,
            speechConfig: {
                voiceConfig: { 
                    prebuiltVoiceConfig: { 
                        voiceName: voiceSelect.value    // You can change voice in the config.js file
                    }
                }
            },

        },
        systemInstruction: {
            parts: [{
                text: systemInstructionInput.value     // You can change system instruction in the config.js file
            }],
        }
    };  

    try {
        await client.connect(config,apiKeyInput.value);
        isConnected = true;
        await resumeAudioContext();
        connectButton.textContent = 'Disconnect';
        connectButton.classList.add('connected');
        messageInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = false;
        cameraButton.disabled = false;
        screenButton.disabled = false;
        logMessage('Connected to Gemini 2.0 Flash Multimodal Live API', 'system');
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        Logger.error('Connection error:', error);
        logMessage(`Connection error: ${errorMessage}`, 'system');
        isConnected = false;
        connectButton.textContent = 'Connect';
        connectButton.classList.remove('connected');
        messageInput.disabled = true;
        sendButton.disabled = true;
        micButton.disabled = true;
        cameraButton.disabled = true;
        screenButton.disabled = true;
    }
}

/**
 * Disconnects from the WebSocket server.
 */
function disconnectFromWebsocket() {
    client.disconnect();
    isConnected = false;
    if (audioStreamer) {
        audioStreamer.stop();
        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        isRecording = false;
        updateMicIcon();
    }
    connectButton.textContent = 'Connect';
    connectButton.classList.remove('connected');
    messageInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    cameraButton.disabled = true;
    screenButton.disabled = true;
    logMessage('Disconnected from server', 'system');
    
    if (videoManager) {
        stopVideo();
    }
    
    if (screenRecorder) {
        stopScreenSharing();
    }
}

/**
 * Handles sending a text message.
 */
function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        logMessage(message, 'user');
        client.send({ text: message });
        messageInput.value = '';
    }
}

// Event Listeners
client.on('open', () => {
    logMessage('WebSocket connection opened', 'system');
});

client.on('log', (log) => {
    logMessage(`${log.type}: ${JSON.stringify(log.message)}`, 'system');
});

client.on('close', (event) => {
    logMessage(`WebSocket connection closed (code ${event.code})`, 'system');
});

client.on('audio', async (data) => {
    try {
        await resumeAudioContext();
        const streamer = await ensureAudioInitialized();
        streamer.addPCM16(new Uint8Array(data));
    } catch (error) {
        logMessage(`Error processing audio: ${error.message}`, 'system');
    }
});

client.on('content', (data) => {
    if (data.modelTurn) {
        if (data.modelTurn.parts.some(part => part.functionCall)) {
            isUsingTool = true;
            Logger.info('Model is using a tool');
        } else if (data.modelTurn.parts.some(part => part.functionResponse)) {
            isUsingTool = false;
            Logger.info('Tool usage completed');
        }

        const text = data.modelTurn.parts.map(part => part.text).join('');
        if (text) {
            logMessage(text, 'ai');
        }
    }
});

client.on('interrupted', () => {
    audioStreamer?.stop();
    isUsingTool = false;
    Logger.info('Model interrupted');
    logMessage('Model interrupted', 'system');
});

client.on('setupcomplete', () => {
    logMessage('Setup complete', 'system');
});

client.on('turncomplete', () => {
    isUsingTool = false;
    logMessage('Turn complete', 'system');
});

client.on('error', (error) => {
    if (error instanceof ApplicationError) {
        Logger.error(`Application error: ${error.message}`, error);
    } else {
        Logger.error('Unexpected error', error);
    }
    logMessage(`Error: ${error.message}`, 'system');
});

client.on('message', (message) => {
    if (message.error) {
        Logger.error('Server error:', message.error);
        logMessage(`Server error: ${message.error}`, 'system');
    }
});

sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

micButton.addEventListener('click', handleMicToggle);

connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnectFromWebsocket();
    } else {
        connectToWebsocket();
    }
});

messageInput.disabled = true;
sendButton.disabled = true;
micButton.disabled = true;
connectButton.textContent = 'Connect';

/**
 * Handles the video toggle. Starts or stops video streaming.
 * @returns {Promise<void>}
 */
async function handleVideoToggle() {
    Logger.info('Video toggle clicked, current state:', { isVideoActive, isConnected });
    
    localStorage.setItem('video_fps', fpsInput.value);

    if (!isVideoActive) {
        try {
            Logger.info('Attempting to start video');
            if (!videoManager) {
                videoManager = new VideoManager();
            }
            
            await videoManager.start(fpsInput.value,(frameData) => {
                if (isConnected) {
                    client.sendRealtimeInput([frameData]);
                }
            });

            isVideoActive = true;
            cameraIcon.textContent = 'videocam_off';
            cameraButton.classList.add('active');
            Logger.info('Camera started successfully');
            logMessage('Camera started', 'system');

        } catch (error) {
            Logger.error('Camera error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isVideoActive = false;
            videoManager = null;
            cameraIcon.textContent = 'videocam';
            cameraButton.classList.remove('active');
        }
    } else {
        Logger.info('Stopping video');
        stopVideo();
    }
}

/**
 * Stops the video streaming.
 */
function stopVideo() {
    if (videoManager) {
        videoManager.stop();
        videoManager = null;
    }
    isVideoActive = false;
    cameraIcon.textContent = 'videocam';
    cameraButton.classList.remove('active');
    logMessage('Camera stopped', 'system');
}

cameraButton.addEventListener('click', handleVideoToggle);
stopVideoButton.addEventListener('click', stopVideo);

cameraButton.disabled = true;

/**
 * Handles the screen share toggle. Starts or stops screen sharing.
 * @returns {Promise<void>}
 */
async function handleScreenShare() {
    if (!isScreenSharing) {
        try {
            screenContainer.style.display = 'block';
            
            screenRecorder = new ScreenRecorder();
            await screenRecorder.start(screenPreview, (frameData) => {
                if (isConnected) {
                    client.sendRealtimeInput([{
                        mimeType: "image/jpeg",
                        data: frameData
                    }]);
                }
            });

            isScreenSharing = true;
            screenIcon.textContent = 'stop_screen_share';
            screenButton.classList.add('active');
            Logger.info('Screen sharing started');
            logMessage('Screen sharing started', 'system');

        } catch (error) {
            Logger.error('Screen sharing error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isScreenSharing = false;
            screenIcon.textContent = 'screen_share';
            screenButton.classList.remove('active');
            screenContainer.style.display = 'none';
        }
    } else {
        stopScreenSharing();
    }
}

/**
 * Stops the screen sharing.
 */
function stopScreenSharing() {
    if (screenRecorder) {
        screenRecorder.stop();
        screenRecorder = null;
    }
    isScreenSharing = false;
    screenIcon.textContent = 'screen_share';
    screenButton.classList.remove('active');
    screenContainer.style.display = 'none';
    logMessage('Screen sharing stopped', 'system');
}

screenButton.addEventListener('click', handleScreenShare);
screenButton.disabled = true;

// Update UI text based on selected language
function updateUILanguage() {
    const t = translations[currentLang];
    
    // 更新页面标题
    document.title = t.title;
    
    // 更新基本UI元素
    apiKeyInput.placeholder = t.apiKeyPlaceholder;

    // 更新所有设置标签
    const settingLabels = document.querySelectorAll('.setting-container .setting-label');
    settingLabels.forEach((label, index) => {
        switch(index) {
            case 0:
                label.textContent = t.soundLabel;
                break;
            case 1:
                label.textContent = t.responseTypeLabel;
                break;
            case 2:
                label.textContent = t.videoFPSLabel;
                break;
        }
    });

    // 更新帮助文本
    const fpsHelp = document.querySelector('.fps-help');
    if (fpsHelp) {
        fpsHelp.textContent = t.fpsHelp;
    }

    // 更新系统指令输入框
    systemInstructionInput.placeholder = t.systemInstructionPlaceholder;

    // 更新按钮文本
    applyConfigButton.textContent = t.confirmButton;
    connectButton.textContent = isConnected ? t.disconnectButton : t.connectButton;
    sendButton.textContent = t.sendButton;

    // 更新输入框占位符
    messageInput.placeholder = t.messageInputPlaceholder;

    // 更新音频标签
    const audioLabels = document.querySelectorAll('.visualizer-container label');
    if (audioLabels.length >= 2) {
        audioLabels[0].textContent = t.labels.inputAudio;
        audioLabels[1].textContent = t.labels.outputAudio;
    }

    // 更新下拉选项 - 声音选择
    const voiceOptions = voiceSelect.options;
    if (voiceOptions.length >= 5) {
        voiceOptions[0].text = t.voiceOptions.puckMale;
        voiceOptions[1].text = t.voiceOptions.charonMale;
        voiceOptions[2].text = t.voiceOptions.fenrirMale;
        voiceOptions[3].text = t.voiceOptions.koreFemale;
        voiceOptions[4].text = t.voiceOptions.aoedeFemale;
    }

    // 更新下拉选项 - 响应类型
    const responseOptions = responseTypeSelect.options;
    if (responseOptions.length >= 2) {
        responseOptions[0].text = t.responseTypes.text;
        responseOptions[1].text = t.responseTypes.audio;
    }

    // 更新视频停止按钮
    const stopVideoBtn = document.getElementById('stop-video');
    if (stopVideoBtn) {
        stopVideoBtn.textContent = t.stopVideo;
    }

    // 更新输入输出音频标签
    const inputAudioLabel = document.querySelector('.visualizer-container:nth-child(1) label');
    const outputAudioLabel = document.querySelector('.visualizer-container:nth-child(2) label');
    if (inputAudioLabel) inputAudioLabel.textContent = t.labels.inputAudio;
    if (outputAudioLabel) outputAudioLabel.textContent = t.labels.outputAudio;
}

// 确保在DOM加载完成后执行初始化
document.addEventListener('DOMContentLoaded', () => {
    updateUILanguage();
    updateSystemInstruction();
});
  