import time as t, random as r

# Function to simulate human-like typing and write to file while printing to console
def a(b, c, d=(0.1, 0.5)):
    """
    Mimic typing behavior with random delays
    """
    for e in c:
        print(e, end='', flush=True)  # Print character to console
        b.write(e)  # Write character to file
        b.flush()  # Flush buffer to ensure immediate writing
        t.sleep(r.uniform(*d))  # Random delay between characters
    print()  # New line after each code line

# Function to simulate writing to file with human-like typing
def x(y, z=10):
    """
    Simulate human-like typing behavior and write obfuscated Node.js code to file.
    """
    # Open the file for writing (will overwrite existing file)
    with open(y, 'w') as f:
        # Sample obfuscated Node.js code
        m = [
            "const q = require('express');\n",
            "const r = q();\n",
            "r.get('/', (s, t) => {\n",
            "    t.send('Hello, World!');\n",
            "});\n",
            "r.listen(3000, () => {\n",
            "    console.log('Server running on port 3000');\n",
            "});\n",
            "\n",  # Adding a newline for separation
            "\n",
            "function j(k) {\n",
            "    return new Promise((l) => {\n",
            "        let i = 0;\n",
            "        const n = setInterval(() => {\n",
            "            process.stdout.write(k[i]);\n",
            "            i++;\n",
            "            if (i === k.length) {\n",
            "                clearInterval(n);\n",
            "                l();\n",
            "            }\n",
            "        }, r.uniform(50, 150)); // Random delay\n",
            "    });\n",
            "}\n"
        ]
        
        # Write the obfuscated Node.js code with simulated human-like typing
        for o in range(z):
            for p in m:
                a(f, p)  # Simulate typing each line of the code
            f.write("\n")  # Add a newline for spacing between code sections
            f.flush()  # Ensure the content is written to the file
            t.sleep(r.uniform(1, 3))  # Simulate a longer break between sets of code
            print(f"Round {o + 1}/{z} done.")  # Show progress message after each round

# Run the function with obfuscation and human-like typing
try:
    x('output_obfuscated.js', z=5)  # Test with 5 iterations of human-like typing
except KeyboardInterrupt:
    print("\nExited gracefully.")
