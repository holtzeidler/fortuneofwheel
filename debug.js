// Debug helper functions
function debugWheelState() {
    console.log('=== WHEEL DEBUG INFO ===');
    console.log('Current Rotation:', wheel.currentRotation);
    console.log('Target Rotation:', wheel.targetRotation);
    console.log('Normalized Rotation:', (wheel.currentRotation % 360 + 360) % 360);
    console.log('Letter Positions:', wheel.letterPositions);
    
    // Find which letter is at the top
    const normalizedRotation = (wheel.currentRotation % 360 + 360) % 360;
    let selectedLetter = null;
    let minAngleDiff = 360;
    
    wheel.letterPositions.forEach(({letter, centerAngle}) => {
        const normalizedCenterAngle = (centerAngle % 360 + 360) % 360;
        const angleDiff = Math.abs(normalizedCenterAngle - normalizedRotation);
        const adjustedAngleDiff = Math.min(angleDiff, 360 - angleDiff);
        
        console.log(`Letter ${letter}: centerAngle=${centerAngle}, normalized=${normalizedCenterAngle}, diff=${adjustedAngleDiff}`);
        
        if (adjustedAngleDiff < minAngleDiff) {
            minAngleDiff = adjustedAngleDiff;
            selectedLetter = letter;
        }
    });
    
    console.log('Selected Letter:', selectedLetter);
    console.log('Min Angle Diff:', minAngleDiff);
    console.log('Spun Letters:', Array.from(wheel.spunLetters));
    console.log('Game Board State:', wheel.gameBoard);
    console.log('========================');
}

function debugGameState() {
    console.log('=== GAME STATE DEBUG ===');
    console.log('Admin Initialized:', wheel.adminInitialized);
    console.log('Phrases:', wheel.phrases);
    console.log('Revealed Letters:', Array.from(wheel.revealedLetters));
    console.log('Letter Instances:', Object.fromEntries(wheel.letterInstances));
    console.log('Last Spun Letter:', wheel.lastSpunLetter);
    console.log('========================');
}

function debugLetterSelection() {
    console.log('=== LETTER SELECTION DEBUG ===');
    const normalizedRotation = (wheel.currentRotation % 360 + 360) % 360;
    console.log('Current Wheel Position (normalized):', normalizedRotation);
    
    // Show next expected letter based on random system
    const nextLetter = wheel.getNextRandomLetter();
    console.log('Next Expected Letter:', nextLetter);
    
    // Show all letter positions and their distances from top
    wheel.letterPositions.forEach(({letter, centerAngle}) => {
        const normalizedCenterAngle = (centerAngle % 360 + 360) % 360;
        const angleDiff = Math.abs(normalizedCenterAngle - normalizedRotation);
        const adjustedAngleDiff = Math.min(angleDiff, 360 - angleDiff);
        const isSpun = wheel.spunLetters.has(letter);
        const hasInstances = wheel.letterInstances.has(letter) && wheel.letterInstances.get(letter) > 0;
        const isVowel = 'AEIOUY'.includes(letter);
        const type = isVowel ? 'VOWEL' : 'CONSONANT';
        
        console.log(`${letter}: angle=${normalizedCenterAngle.toFixed(1)}°, diff=${adjustedAngleDiff.toFixed(1)}°, spun=${isSpun}, instances=${hasInstances}, type=${type}`);
    });
    console.log('========================');
}

function debugLetterWeights() {
    console.log('=== RANDOM LETTER SYSTEM DEBUG ===');
    
    // Show all letters and their status
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const vowels = 'AEIOUY'.split('');
    
    console.log('All Letters Status:');
    allLetters.forEach((letter, index) => {
        const isSpun = wheel.spunLetters.has(letter);
        const status = isSpun ? 'SPUN' : 'AVAILABLE';
        const isVowel = vowels.includes(letter);
        const type = isVowel ? 'VOWEL' : 'CONSONANT';
        
        console.log(`  ${index + 1}. ${letter} (${type}): ${status}`);
    });
    
    // Show next 5 expected letters
    console.log('\nNext 5 expected letters (random):');
    for (let i = 0; i < 5; i++) {
        const tempSpun = new Set(wheel.spunLetters);
        const tempWheel = { ...wheel, spunLetters: tempSpun };
        
        // Simulate spinning the next few letters
        for (let j = 0; j < i; j++) {
            const nextLetter = tempWheel.getNextRandomLetter();
            if (nextLetter) {
                tempSpun.add(nextLetter);
            }
        }
        
        const nextLetter = tempWheel.getNextRandomLetter();
        if (nextLetter) {
            const isVowel = vowels.includes(nextLetter);
            const type = isVowel ? 'VOWEL' : 'CONSONANT';
            console.log(`  ${i + 1}. ${nextLetter} (${type})`);
        }
    }
    
    console.log('========================');
}

// Add debug buttons to the page (Admin Panel button removed)
function addDebugButtons() {
    const debugContainer = document.createElement('div');
    debugContainer.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; gap: 5px;';
    
    const debugWheelBtn = document.createElement('button');
    debugWheelBtn.textContent = '🐛 Debug Wheel';
    debugWheelBtn.style.cssText = 'padding: 8px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    debugWheelBtn.onclick = debugWheelState;
    
    const debugGameBtn = document.createElement('button');
    debugGameBtn.textContent = '🎮 Debug Game';
    debugGameBtn.style.cssText = 'padding: 8px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    debugGameBtn.onclick = debugGameState;
    
    const debugLetterBtn = document.createElement('button');
    debugLetterBtn.textContent = '🔤 Debug Letters';
    debugLetterBtn.style.cssText = 'padding: 8px; background: #45b7d1; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    debugLetterBtn.onclick = debugLetterSelection;
    
    const debugWeightBtn = document.createElement('button');
    debugWeightBtn.textContent = '🎲 Debug Random';
    debugWeightBtn.style.cssText = 'padding: 8px; background: #ffa726; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;';
    debugWeightBtn.onclick = debugLetterWeights;
    
    debugContainer.appendChild(debugWheelBtn);
    debugContainer.appendChild(debugGameBtn);
    debugContainer.appendChild(debugLetterBtn);
    debugContainer.appendChild(debugWeightBtn);
    document.body.appendChild(debugContainer);
}

// Auto-add debug buttons when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addDebugButtons, 1000);
});
