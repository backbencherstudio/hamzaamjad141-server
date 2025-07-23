import time
import random

# Function to simulate human-like typing and write to file while printing to console
def simulate_typing_live_to_file(file, code_line, delay_range=(0.1, 0.5)):
    """
    Simulate typing each character with a delay to mimic human typing.
    The output will be written to both the file and the console.
    
    :param file: The file object to write to
    :param code_line: The line of code to type
    :param delay_range: The range of time delay between typing characters
    """
    for char in code_line:
        print(char, end='', flush=True)  # Print each character to the console
        file.write(char)  # Write each character to the file
        file.flush()  # Ensure the character is immediately written to the file
        time.sleep(random.uniform(*delay_range))  # Pause to simulate human typing
    print()  # Print a new line after the full line of code

def write_code_live_to_file(filename, iterations=10):
    # Open the file for writing (will overwrite existing file)
    with open(filename, 'w') as f:
        # Define a list of sample Node.js code lines (this could be any code you want)
        code_lines = [
            "const express = require('express');\n",
            "const app = express();\n",
            "app.get('/', (req, res) => {\n",
            "    res.send('Hello, World!');\n",
            "});\n",
            "app.listen(3000, () => {\n",
            "    console.log('Server running on port 3000');\n",
            "});\n",
            "\n",  # Adding a newline for separation
            "// Simulate human-like typing in Node.js code\n",
            "function simulateTyping(code) {\n",
            "    return new Promise((resolve) => {\n",
            "        let index = 0;\n",
            "        const interval = setInterval(() => {\n",
            "            process.stdout.write(code[index]);\n",
            "            index++;\n",
            "            if (index === code.length) {\n",
            "                clearInterval(interval);\n",
            "                resolve();\n",
            "            }\n",
            "        }, Math.random() * 100 + 50); // Random delay between characters\n",
            "    });\n",
            "}\n"
        ]
        
        # Set a counter to stop the loop after a certain number of iterations
        for i in range(iterations):
            for line in code_lines:
                simulate_typing_live_to_file(f, line)  # Simulate typing each line live
            f.write("\n")  # Additional new line for spacing
            f.flush()  # Flush to disk
            time.sleep(random.uniform(1, 3))  # Simulate a longer break between sets of code
            print(f"Iteration {i + 1}/{iterations} completed.")  # Show progress

# Call the function to start writing code continuously for a specific number of iterations
try:
    write_code_live_to_file('node_js_human_like_typing_code.js', iterations=5)  # Limit iterations to 5 for testing
except KeyboardInterrupt:
    print("\nProcess interrupted. Exiting gracefully.")
