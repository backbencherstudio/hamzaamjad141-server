import speech_recognition as sr
import pyttsx3
import threading
import queue
import google.generativeai as genai
from datetime import datetime
import sys

class GeniusPilotAssistant:
    def __init__(self):
        # Initialize AI model
        self.api_key = 'AIzaSyA5up7kkJ1THciQC4sHs3HOEcfYzHHt9JA'
        self.configure_ai()

        # Setup voice recognition and speech synthesis systems
        self.recognizer = sr.Recognizer()
        self.microphone = None
        self.audio_source = None
        self.engine = self.init_tts()

        # Threading and speech queues
        self.speech_queue = queue.Queue()
        self.listening = False
        self.running = True

        # Initialize microphone and start listening
        self.init_microphone()

        # Start the speech processing thread
        self.speech_thread = threading.Thread(target=self.process_speech)
        self.speech_thread.daemon = True
        self.speech_thread.start()

        # Flight context
        self.flight_context = {
            'phase': 'pre-flight',
            'emergency': False,
            'last_message': ''
        }

    def configure_ai(self):
        """Configure AI model and check available models."""
        try:
            # Configure AI with the provided API key
            genai.configure(api_key=self.api_key)

            # Debug: List available attributes and methods
            print("Available functions in genai:", dir(genai))

            # Directly initialize the model (ensure you have a valid model ID or name)
            model_name = "your_model_name_or_id_here"  # Replace this with the correct model name or ID
            self.model = genai.GenerativeModel(model_name)
            print(f"Model initialized with name: {model_name}")
        except Exception as e:
            print(f"AI setup error: {e}")
            sys.exit(1)

    def init_tts(self):
        """Initialize text-to-speech engine."""
        try:
            engine = pyttsx3.init()
            engine.setProperty('rate', 170)
            voices = engine.getProperty('voices')
            for voice in voices:
                if 'David' in voice.name:
                    engine.setProperty('voice', voice.id)
                    break
            return engine
        except Exception as e:
            print(f"Error initializing TTS: {e}")
            return None

    def init_microphone(self):
        """Initialize microphone with error handling."""
        try:
            self.microphone = sr.Microphone()
            print("Microphone initialized successfully")
        except Exception as e:
            print(f"Microphone error: {e}")
            print("Switching to default audio input")

    def start_listening(self):
        """Begin voice recognition loop."""
        if not self.engine:
            print("Text-to-speech system unavailable.")
            return

        self.listening = True
        self.speak("Genius Pilot Assistant online. Ready to assist you.")

        source = self.microphone if self.microphone else sr.Microphone()

        with source as source:
            try:
                self.recognizer.adjust_for_ambient_noise(source)

                while self.listening and self.running:
                    print("Listening for commands...")
                    audio = self.recognizer.listen(source, timeout=3, phrase_time_limit=5)
                    try:
                        command = self.recognizer.recognize_google(audio)
                        self.process_command(command)
                    except sr.UnknownValueError:
                        self.speak("I didn't catch that. Could you repeat, please?")
                    except Exception as e:
                        print(f"Recognition error: {e}")
                        self.speak("An error occurred while processing your voice command.")
            except Exception as e:
                print(f"Error with audio source: {e}")
                self.speak("I encountered an issue. Switching to text mode.")
                self.text_input_mode()

    def text_input_mode(self):
        """Fallback mode for text input."""
        print("\nEnter your commands (type 'quit' to exit):")
        while self.running:
            command = input("> ")
            if command.lower() == 'quit':
                self.stop()
                break
            self.process_command(command)

    def process_command(self, command):
        """Process the voice or text command."""
        if not command:
            return

        print(f"Command received: {command}")
        self.flight_context['last_message'] = command

        # Emergency keywords
        emergency_keywords = ['emergency', 'mayday', 'help', 'problem', 'crash']
        if any(keyword in command.lower() for keyword in emergency_keywords):
            self.flight_context['emergency'] = True
            self.handle_emergency(command)
        else:
            self.generate_ai_response(command)

    def handle_emergency(self, command):
        """Handle emergency scenarios with an appropriate AI response."""
        prompt = f"""Pilot declared an emergency with the message: "{command}"
        Provide immediate response actions, reassurance, and next steps.
        Ensure the language is calm and precise."""

        try:
            response = self.model.generate_content(prompt)
            self.speak(response.text)
        except Exception as e:
            print(f"AI error: {e}")
            self.speak("Emergency protocols triggered. Follow standard procedures.")

    def generate_ai_response(self, command):
        """Generate an AI response based on the command."""
        prompt = f"""Pilot said: "{command}"
        Current phase: {self.flight_context['phase']}
        Respond as a professional assistant, giving a brief acknowledgment and offering help."""
        
        try:
            response = self.model.generate_content(prompt)
            self.speak(response.text)
        except Exception as e:
            print(f"AI error: {e}")
            self.speak("There was an issue processing your request. Please try again.")

    def speak(self, text):
        """Convert text to speech."""
        if not text or not self.engine:
            return

        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Assistant: {text}")
        self.speech_queue.put(text)

    def process_speech(self):
        """Process text-to-speech queue."""
        while self.running:
            try:
                text = self.speech_queue.get(timeout=1)
                if text and self.engine:
                    self.engine.say(text)
                    self.engine.runAndWait()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Speech error: {e}")

    def stop(self):
        """Stop the assistant."""
        self.running = False
        self.listening = False
        self.speech_queue.put("")  # Unblock queue
        if self.speech_thread.is_alive():
            self.speech_thread.join()
        if self.engine:
            self.engine.stop()
        print("Assistant powered down.")

if __name__ == "__main__":
    assistant = GeniusPilotAssistant()

    try:
        print("Genius Pilot Assistant starting...")
        assistant.start_listening()
    except KeyboardInterrupt:
        print("\nShutting down...")
        assistant.stop()
    except Exception as e:
        print(f"Fatal error: {e}")
        assistant.stop()
        sys.exit(1)
