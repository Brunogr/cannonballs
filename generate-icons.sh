#!/bin/bash

# Create icons directory if it doesn't exist
mkdir -p icons

# Create a base SVG icon (a simple cannon design)
cat > icons/base-icon.svg << 'EOF'
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#4a90e2" rx="100"/>
  <!-- Cannon base -->
  <rect x="156" y="300" width="200" height="80" fill="#555" rx="10"/>
  <!-- Cannon barrel -->
  <rect x="106" y="260" width="250" height="60" fill="#333" rx="10"/>
  <!-- Cannon wheel -->
  <circle cx="256" cy="340" r="40" fill="#666"/>
  <!-- Cannonball -->
  <circle cx="386" cy="290" r="20" fill="#222"/>
</svg>
EOF

# Convert SVG to PNG at different sizes
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    convert icons/base-icon.svg -resize ${size}x${size} icons/icon-${size}x${size}.png
done

# Clean up SVG
rm icons/base-icon.svg

echo "Icons generated successfully!" 