class WheelOfFortune {
    constructor() {
        this.phrases = [];
        this.isSpinning = false;
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.revealedLetters = new Set();
        this.gameBoard = {};
        this.rowLengths = [12, 14, 14, 14, 14, 14, 14, 14, 12];
        this.spunLetters = new Set();
        this.letterInstances = new Map();
        this.lastSpunLetter = null;
        this.adminInitialized = false;
        
        this.initializeEventListeners();
        this.forceClearOldState();
        this.checkAdminInitialization();
        this.createAlphabetGrid();
        this.drawWheel();
        
        // Listen for messages from admin panel
        window.addEventListener('message', (event) => this.handleAdminMessage(event));
    }

    normalizeChar(char) {
        // Normalize accented characters to their base letters
        return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    }

    forceClearOldState() {
        // Force clear any old game state that might be lingering
        console.log('🧹 Game: Force clearing old game state...');
        
        this.revealedLetters.clear();
        this.spunLetters.clear();
        this.letterInstances.clear();
        this.lastSpunLetter = null;
        this.currentRotation = 0;
        this.targetRotation = 0;
        
        // Only clear game state keys, NOT phrases or admin initialization
        const keysToRemove = [
            'wheelOfFortuneRevealedLetters',
            'wheelOfFortuneSpunLetters',
            'wheelOfFortuneGameState',
            'wheelOfFortuneLastSpunLetter',
            'wheelOfFortuneLetterInstances',
            'wheelOfFortuneCurrentRotation',
            'wheelOfFortuneTargetRotation'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('✅ Old game state cleared - phrases preserved!');
    }

    checkAdminInitialization() {
        // Check if admin has been properly initialized
        this.adminInitialized = localStorage.getItem('wheelOfFortuneAdminInitialized') === 'true';
        
        if (!this.adminInitialized) {
            this.showAdminFirstMessage();
            return;
        }
        
        // Load phrases only if admin was initialized
        this.loadPhrasesFromStorage();
        this.createGameBoard();
    }

    showAdminFirstMessage() {
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            gameBoard.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h3 style="color: #667eea; margin-bottom: 20px;">⚠️ Admin Panel Required</h3>
                    <p style="color: #666; margin-bottom: 20px;">
                        Please open the Admin Panel first to set up your phrases before playing the game.
                    </p>
                    <a href="admin.html" target="_blank" class="admin-btn" style="display: inline-block; margin-top: 20px;">
                        🔧 Open Admin Panel
                    </a>
                </div>
            `;
        }
        
        // Disable spin button
        const spinButton = document.getElementById('spinButton');
        if (spinButton) {
            spinButton.disabled = true;
            spinButton.textContent = 'Admin Required';
        }
    }

    initializeEventListeners() {
        document.getElementById('spinButton').addEventListener('click', () => this.spinWheel());
    }

    handleAdminMessage(event) {
        console.log(`📨 Game: Received message:`, event.data);
        
        if (!event.data || !event.data.action) {
            console.log(`⚠️ Game: Invalid message format`);
            return;
        }
        
        switch (event.data.action) {
            case 'newGame':
                console.log(`🎮 Game: Handling newGame action`);
                this.newGame();
                break;
            case 'resetGame':
                console.log(`🔄 Game: Handling resetGame action`);
                this.resetGame();
                break;
            case 'revealWord':
                console.log(`🔍 Game: Handling revealWord action`);
                this.revealWord(event.data.rowIndex, event.data.phrase);
                break;
            default:
                console.log(`⚠️ Game: Unknown action: ${event.data.action}`);
        }
    }

    loadPhrasesFromStorage() {
        const saved = localStorage.getItem('wheelOfFortunePhrases');
        if (saved) {
            this.phrases = JSON.parse(saved);
        } else {
            // No phrases loaded - this should not happen if admin was initialized
            this.phrases = [];
        }
    }

    createAlphabetGrid() {
        const alphabetGrid = document.getElementById('alphabetGrid');
        alphabetGrid.innerHTML = '';
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(letter => {
            const letterItem = document.createElement('div');
            letterItem.className = 'letter-item';
            letterItem.textContent = letter;
            letterItem.id = `letter-${letter}`;
            alphabetGrid.appendChild(letterItem);
        });
    }

    newGame() {
        if (!this.adminInitialized || this.phrases.length === 0) {
            alert('Please set up phrases in the Admin Panel first!');
            return;
        }
        
        this.forceClearOldState();
        this.createGameBoard();
        this.updateAlphabetGrid();
        document.getElementById('currentLetter').textContent = 'New game started! Spin to reveal letters!';
        document.getElementById('revealedCount').textContent = 'Letters revealed: 0';
    }

    resetGame() {
        if (!this.adminInitialized || this.phrases.length === 0) {
            alert('Please set up phrases in the Admin Panel first!');
            return;
        }
        
        this.forceClearOldState();
        this.createGameBoard();
        this.updateAlphabetGrid();
        document.getElementById('currentLetter').textContent = 'Game reset! All letters are hidden again!';
        document.getElementById('revealedCount').textContent = 'Letters revealed: 0';
    }

    revealWordByDoubleClick(phraseIndex) {
        console.log(`🖱️ Game: Double-click reveal for phrase index ${phraseIndex}`);
        
        if (!this.adminInitialized || this.phrases.length === 0) {
            return;
        }
        
        if (phraseIndex < 0 || phraseIndex >= this.phrases.length) {
            console.log(`❌ Game: Invalid phrase index ${phraseIndex}`);
            return;
        }
        
        const phraseData = this.phrases[phraseIndex];
        const rowNum = phraseData.row + 1;
        const row = document.getElementById(`row${rowNum}`);
        
        if (!row) {
            console.log(`❌ Game: Could not find row element row${rowNum}`);
            return;
        }
        
        // Find all blocks that belong to this specific phrase using phraseIndex
        const phraseBlocks = row.querySelectorAll(`.letter-block[data-phrase-index="${phraseIndex}"]`);
        console.log(`🔍 Game: Found ${phraseBlocks.length} blocks for phrase index ${phraseIndex}`);
        
        // Reveal all letter blocks for this phrase
        let revealedCount = 0;
        const lettersRevealedInWord = new Set(); // Track which letters were revealed in this word
        
        phraseBlocks.forEach(block => {
            // Reveal letter blocks (not spaces, buffers, or unused blocks)
            if (block.dataset.letter && !block.classList.contains('space') && !block.classList.contains('buffer') && !block.classList.contains('unused')) {
                block.classList.remove('hidden');
                block.classList.add('revealed');
                // Display the original character (with accent if it had one)
                block.textContent = block.dataset.originalLetter || block.dataset.letter;
                revealedCount++;
                
                // Track which letter was revealed
                const letter = block.dataset.letter;
                lettersRevealedInWord.add(letter);
                
                // Add to revealed letters using the uniqueId from gameBoard
                const charIndex = parseInt(block.dataset.charIndex);
                
                // Find the uniqueId for this letter instance
                if (this.gameBoard[letter]) {
                    const letterInstance = this.gameBoard[letter].find(inst => 
                        inst.phraseIndex === phraseIndex && inst.charIndex === charIndex
                    );
                    if (letterInstance) {
                        this.revealedLetters.add(letterInstance.uniqueId);
                    }
                }
            }
        });
        
        console.log(`✅ Game: Revealed ${revealedCount} blocks for phrase "${phraseData.text}"`);
        
        // After revealing, check if any letters are now fully revealed (all instances revealed)
        // If so, mark them as "spun" so they won't be available for future spins
        lettersRevealedInWord.forEach(letter => {
            if (this.isLetterFullyRevealed(letter)) {
                console.log(`🎯 Game: Letter ${letter} is now fully revealed - marking as spun`);
                this.spunLetters.add(letter);
            }
        });
        
        this.updateRevealedCount();
        this.checkGameComplete();
    }

    revealWord(rowIndex, phrase) {
        console.log(`🎯 Game: revealWord called with rowIndex=${rowIndex}, phrase="${phrase}"`);
        
        if (!this.adminInitialized || this.phrases.length === 0) {
            console.log(`❌ Game: Admin not initialized or no phrases`);
            return;
        }
        
        // Find the phrase in our phrases array (case-insensitive match)
        const phraseData = this.phrases.find(p => 
            p.text.toUpperCase() === phrase.toUpperCase() && p.row === rowIndex
        );
        
        if (!phraseData) {
            console.log(`❌ Game: Could not find phrase "${phrase}" in row ${rowIndex}`);
            console.log(`📋 Game: Available phrases:`, this.phrases.map(p => `${p.text} (row ${p.row})`));
            return;
        }
        
        const phraseIndex = this.phrases.indexOf(phraseData);
        console.log(`✅ Game: Found phrase at index ${phraseIndex}`);
        
        const row = document.getElementById(`row${rowIndex + 1}`);
        if (!row) {
            console.log(`❌ Game: Could not find row element row${rowIndex + 1}`);
            return;
        }
        
        // Find all blocks that belong to this specific phrase using phraseIndex
        const phraseBlocks = row.querySelectorAll(`.letter-block[data-phrase-index="${phraseIndex}"]`);
        console.log(`🔍 Game: Found ${phraseBlocks.length} blocks for phrase index ${phraseIndex}`);
        
        if (phraseBlocks.length === 0) {
            // Try alternative: find all blocks in the row and filter by phraseIndex
            const allBlocks = row.querySelectorAll('.letter-block');
            console.log(`🔍 Game: Total blocks in row: ${allBlocks.length}`);
            allBlocks.forEach((block, idx) => {
                console.log(`  Block ${idx}: phrase-index=${block.dataset.phraseIndex}, char-index=${block.dataset.charIndex}, letter=${block.dataset.letter}`);
            });
        }
        
        // Reveal all letter blocks for this phrase
        let revealedCount = 0;
        phraseBlocks.forEach(block => {
            // Reveal both hidden blocks and blocks that might already be partially revealed
            if (block.dataset.letter && !block.classList.contains('space') && !block.classList.contains('buffer') && !block.classList.contains('unused')) {
                block.classList.remove('hidden');
                block.classList.add('revealed');
                // Display the original character (with accent if it had one)
                block.textContent = block.dataset.originalLetter || block.dataset.letter;
                revealedCount++;
                
                // Add to revealed letters using the uniqueId from gameBoard
                const letter = block.dataset.letter;
                const charIndex = parseInt(block.dataset.charIndex);
                
                // Find the uniqueId for this letter instance
                if (this.gameBoard[letter]) {
                    const letterInstance = this.gameBoard[letter].find(inst => 
                        inst.phraseIndex === phraseIndex && inst.charIndex === charIndex
                    );
                    if (letterInstance) {
                        this.revealedLetters.add(letterInstance.uniqueId);
                    }
                }
            }
        });
        
        console.log(`✅ Game: Revealed ${revealedCount} blocks for phrase "${phrase}"`);
        
        this.updateRevealedCount();
        this.checkGameComplete();
    }

    createGameBoard() {
        if (!this.adminInitialized || this.phrases.length === 0) {
            return;
        }
        
        // Clear existing board
        this.gameBoard = {};
        this.letterInstances.clear();
        
        for (let i = 1; i <= this.rowLengths.length; i++) {
            const row = document.getElementById(`row${i}`);
            row.innerHTML = '';
        }

        // Create blocks for each phrase
        this.phrases.forEach((phraseData, phraseIndex) => {
            const rowNum = phraseData.row + 1;
            const row = document.getElementById(`row${rowNum}`);
            const phrase = phraseData.text;
            const startPosition = phraseData.position;
            
            // Add buffer block at start if this is the first phrase in the row
            if (startPosition === 0) {
                const startBuffer = document.createElement('div');
                startBuffer.className = 'letter-block buffer';
                startBuffer.textContent = '';
                row.appendChild(startBuffer);
            }
            
            // Find the first letter index (skip spaces)
            let firstLetterIndex = -1;
            for (let j = 0; j < phrase.length; j++) {
                if (phrase[j] !== ' ') {
                    firstLetterIndex = j;
                    break;
                }
            }
            
            // Add phrase blocks
            for (let i = 0; i < phrase.length; i++) {
                const block = document.createElement('div');
                block.className = 'letter-block';
                
                const char = phrase[i];
                if (char === ' ') {
                    block.className = 'letter-block space';
                    block.textContent = '';
                } else {
                    // Normalize the character (á -> A, é -> E, etc.)
                    const normalizedChar = this.normalizeChar(char);
                    
                    // Initially hide the letter
                    block.className = 'letter-block hidden';
                    block.dataset.letter = normalizedChar; // Store normalized version
                    block.dataset.originalLetter = char; // Keep original for display
                    block.dataset.row = rowNum;
                    block.dataset.position = i;
                    block.dataset.phraseIndex = phraseIndex;
                    block.dataset.charIndex = i;
                    
                    // Add double-click event listener to reveal word (only on first letter)
                    if (i === firstLetterIndex) {
                        block.classList.add('first-letter');
                        console.log(`✨ Added first-letter class to block at index ${i} for phrase "${phrase}"`);
                        block.addEventListener('dblclick', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(`🖱️ Double-click detected on first letter of phrase "${phrase}"`);
                            this.revealWordByDoubleClick(phraseIndex);
                        });
                        block.style.cursor = 'pointer';
                        block.title = 'Double-click to reveal this word';
                    }
                    
                    // Store in game board with unique identifier (using normalized char)
                    if (!this.gameBoard[normalizedChar]) {
                        this.gameBoard[normalizedChar] = [];
                    }
                    this.gameBoard[normalizedChar].push({
                        row: rowNum, 
                        position: i,
                        phraseIndex: phraseIndex,
                        charIndex: i,
                        uniqueId: `${rowNum}-${phraseIndex}-${i}`
                    });
                    
                    // Track letter instances (using normalized char)
                    if (!this.letterInstances.has(normalizedChar)) {
                        this.letterInstances.set(normalizedChar, 0);
                    }
                    this.letterInstances.set(normalizedChar, this.letterInstances.get(normalizedChar) + 1);
                }
                
                row.appendChild(block);
            }
            
            // Add buffer block at end
            const endBuffer = document.createElement('div');
            endBuffer.className = 'letter-block buffer';
            endBuffer.textContent = '';
            row.appendChild(endBuffer);
        });
        
        // Fill remaining blocks with unused blocks
        this.phrases.forEach((phraseData, phraseIndex) => {
            const rowNum = phraseData.row + 1;
            const row = document.getElementById(`row${rowNum}`);
            const rowLength = this.rowLengths[phraseData.row];
            const currentBlocks = row.children.length;
            const remainingBlocks = rowLength - currentBlocks;
            
            for (let i = 0; i < remainingBlocks; i++) {
                const block = document.createElement('div');
                block.className = 'letter-block unused';
                block.textContent = '';
                row.appendChild(block);
            }
        });
    }

    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Create 26 segments for letters A-Z
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const anglePerSegment = (2 * Math.PI) / 26;
        
        // Store letter positions for accurate calculation
        this.letterPositions = [];
        
        letters.forEach((letter, index) => {
            const startAngle = index * anglePerSegment + this.currentRotation;
            const endAngle = startAngle + anglePerSegment;
            
            // Store the center angle of each segment
            this.letterPositions.push({
                letter: letter,
                centerAngle: startAngle + anglePerSegment / 2
            });
            
            // Alternate colors for visual appeal
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
            const color = colors[index % colors.length];
            
            // Draw segment
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();
            this.ctx.lineWidth = 2;
            
            // Draw letter
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + anglePerSegment / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 18px Poppins';
            this.ctx.fillText(letter, radius * 0.7, 6);
            this.ctx.restore();
        });
    }

    spinWheel() {
        if (!this.adminInitialized || this.phrases.length === 0) {
            alert('Please set up phrases in the Admin Panel first!');
            return;
        }
        
        if (this.isSpinning) {
            return;
        }
        
        // Cleanup: Mark any fully revealed letters as spun (catch any that were missed)
        // This ensures letters fully revealed via double-click or other means are excluded
        this.markFullyRevealedLettersAsSpun();
        
        // Check if there are any available letters in the phrases
        const availableLetters = this.getAvailableLettersInPhrases();
        if (availableLetters.length === 0) {
            alert('All letters in the phrases have been revealed!');
            return;
        }
        
        this.isSpinning = true;
        const spinButton = document.getElementById('spinButton');
        spinButton.disabled = true;
        spinButton.textContent = 'Spinning...';
        
        // Generate random spin with more realistic physics
        const minSpins = 4;
        const maxSpins = 10;
        const spins = Math.random() * (maxSpins - minSpins) + minSpins;
        const extraDegrees = Math.random() * 360;
        const totalDegrees = spins * 360 + extraDegrees;
        
        this.targetRotation = this.currentRotation + totalDegrees;
        
        // Animate the spin with 2 second duration and gradual slowdown
        const startTime = performance.now();
        const duration = 2000; // 2 seconds
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Custom easing function for gradual slowdown
            // Start fast, then gradually slow down
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            // Combine easing functions for realistic physics
            const combinedEasing = (easeOutQuart + easeOutExpo) / 2;
            
            this.currentRotation = this.currentRotation + (totalDegrees * combinedEasing - this.currentRotation + this.targetRotation - totalDegrees) * 0.1;
            
            this.drawWheel();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.finishSpin();
            }
        };
        
        requestAnimationFrame(animate);
    }

    finishSpin() {
        this.isSpinning = false;
        const spinButton = document.getElementById('spinButton');
        spinButton.disabled = false;
        spinButton.textContent = 'SPIN!';
        
        // Calculate which letter the pointer is pointing to
        // The pointer is at the top (0 degrees), so we need to find which segment is at the top
        const normalizedRotation = (this.currentRotation % 360 + 360) % 360;
        
        // Find the letter at the top position by finding the segment center closest to 0 degrees
        let selectedLetter = null;
        let minAngleDiff = 360;
        
        this.letterPositions.forEach(({letter, centerAngle}) => {
            const normalizedCenterAngle = (centerAngle % 360 + 360) % 360;
            const angleDiff = Math.abs(normalizedCenterAngle - normalizedRotation);
            const adjustedAngleDiff = Math.min(angleDiff, 360 - angleDiff);
            
            if (adjustedAngleDiff < minAngleDiff) {
                minAngleDiff = adjustedAngleDiff;
                selectedLetter = letter;
            }
        });
        
        // Get available letters that are in the phrases and haven't been spun
        const availableLetters = this.getAvailableLettersInPhrases();
        
        // If the detected letter is not in the phrases or has been spun, pick a random one from available letters
        if (!availableLetters.includes(selectedLetter) || this.spunLetters.has(selectedLetter)) {
            if (availableLetters.length > 0) {
                // Pick a random letter from letters that appear in phrases
                selectedLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
            } else {
                // All letters in phrases have been spun
                alert('All letters in the phrases have been revealed!');
                this.isSpinning = false;
                const spinButton = document.getElementById('spinButton');
                spinButton.disabled = false;
                spinButton.textContent = 'SPIN!';
                return;
            }
        }
        
        // Mark letter as spun
        this.spunLetters.add(selectedLetter);
        this.lastSpunLetter = selectedLetter;
        
        // Display the selected letter
        document.getElementById('currentLetter').textContent = `Letter: ${selectedLetter}`;
        
        // Reveal the letter on the board
        this.revealLetter(selectedLetter);
        
        // Update alphabet grid
        this.updateAlphabetGrid();
        
        // Check if game is complete
        this.checkGameComplete();
    }

    revealLetter(letter) {
        // Normalize the letter to handle accented characters
        const normalizedLetter = this.normalizeChar(letter);
        
        if (this.gameBoard[normalizedLetter]) {
            // Reveal ALL instances of this letter across all words
            this.gameBoard[normalizedLetter].forEach(({row, phraseIndex, charIndex, uniqueId}) => {
                // Find the block using phraseIndex and charIndex for unique identification
                const block = document.querySelector(`#row${row} .letter-block[data-phrase-index="${phraseIndex}"][data-char-index="${charIndex}"]`);
                
                if (block && block.classList.contains('hidden')) {
                    block.classList.remove('hidden');
                    block.classList.add('revealed');
                    // Display the original character (with accent if it had one)
                    block.textContent = block.dataset.originalLetter || block.dataset.letter;
                    this.revealedLetters.add(uniqueId);
                }
            });
            
            this.updateRevealedCount();
            
            // After revealing all instances, check if letter is now fully revealed
            // (This should always be true after revealLetter, but check anyway)
            if (this.isLetterFullyRevealed(normalizedLetter)) {
                if (!this.spunLetters.has(normalizedLetter)) {
                    console.log(`🎯 Game: Letter ${normalizedLetter} is now fully revealed after spin - marking as spun`);
                    this.spunLetters.add(normalizedLetter);
                }
            }
        }
    }

    updateRevealedCount() {
        const totalLetters = this.phrases.reduce((sum, phrase) => sum + phrase.text.replace(/\s/g, '').length, 0);
        const revealedCount = this.revealedLetters.size;
        document.getElementById('revealedCount').textContent = `Letters revealed: ${revealedCount}/${totalLetters}`;
    }

    updateAlphabetGrid() {
        // Clear previous states
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(letter => {
            const letterElement = document.getElementById(`letter-${letter}`);
            if (letterElement) {
                letterElement.classList.remove('spun', 'no-instance', 'has-instance');
            }
        });
        
        // Update with current states
        this.spunLetters.forEach(letter => {
            const letterElement = document.getElementById(`letter-${letter}`);
            if (letterElement) {
                letterElement.classList.add('spun');
                
                // Check if letter has instances on the board
                if (this.letterInstances.has(letter) && this.letterInstances.get(letter) > 0) {
                    letterElement.classList.add('has-instance');
                } else {
                    letterElement.classList.add('no-instance');
                }
            }
        });
    }

    getAvailableLettersInPhrases() {
        // Get all letters that appear in the phrases, haven't been spun, and still have hidden instances
        // This method checks the actual DOM to see which letters are still hidden (more reliable)
        const lettersInPhrases = new Set();
        
        // Collect all unique letters from phrases (normalized)
        this.phrases.forEach(phrase => {
            const phraseText = phrase.text.toUpperCase();
            for (let i = 0; i < phraseText.length; i++) {
                const char = phraseText[i];
                const normalizedChar = this.normalizeChar(char);
                if (normalizedChar >= 'A' && normalizedChar <= 'Z') {
                    lettersInPhrases.add(normalizedChar);
                }
            }
        });
        
        // Filter to only include letters that:
        // 1. Haven't been spun yet (or fully revealed via double-click)
        // 2. Still have at least one hidden instance on the board (check DOM directly)
        const availableLetters = Array.from(lettersInPhrases).filter(letter => {
            // Skip if already spun (this includes letters fully revealed via double-click)
            if (this.spunLetters.has(letter)) {
                return false;
            }
            
            // Double-check: if letter is fully revealed, exclude it (safety check)
            if (this.isLetterFullyRevealed(letter)) {
                // Mark it as spun if not already marked (shouldn't happen, but safety)
                if (!this.spunLetters.has(letter)) {
                    console.log(`⚠️ Game: Letter ${letter} is fully revealed but not marked as spun - fixing now`);
                    this.spunLetters.add(letter);
                }
                return false;
            }
            
            // Check the actual DOM to see if this letter has any hidden instances
            // Look for blocks with this letter that still have the 'hidden' class
            // Exclude spaces, buffers, and unused blocks
            let hasHiddenInstance = false;
            
            // Check all rows for hidden instances of this letter
            for (let rowNum = 1; rowNum <= this.rowLengths.length; rowNum++) {
                const row = document.getElementById(`row${rowNum}`);
                if (!row) continue;
                
                // Find all letter blocks with this letter that are still hidden
                // Must have data-letter attribute, hidden class, and NOT be space/buffer/unused
                const allBlocks = row.querySelectorAll(`.letter-block[data-letter="${letter}"]`);
                
                for (const block of allBlocks) {
                    // Check if it's a real letter block (not space, buffer, or unused)
                    if (block.classList.contains('space') || 
                        block.classList.contains('buffer') || 
                        block.classList.contains('unused')) {
                        continue;
                    }
                    
                    // Check if it's still hidden
                    if (block.classList.contains('hidden')) {
                        hasHiddenInstance = true;
                        break;
                    }
                }
                
                if (hasHiddenInstance) break;
            }
            
            return hasHiddenInstance;
        });
        
        console.log(`🔍 Available letters check: ${availableLetters.length} letters with hidden instances`);
        console.log(`   Available: ${availableLetters.join(', ')}`);
        console.log(`   Spun letters: ${Array.from(this.spunLetters).join(', ')}`);
        
        return availableLetters;
    }

    markFullyRevealedLettersAsSpun() {
        // Scan all letters in the phrases and mark any fully revealed ones as spun
        // This catches letters that were fully revealed via double-click or other means
        const lettersInPhrases = new Set();
        
        // Collect all unique letters from phrases
        this.phrases.forEach(phrase => {
            const phraseText = phrase.text.toUpperCase();
            for (let i = 0; i < phraseText.length; i++) {
                const char = phraseText[i];
                const normalizedChar = this.normalizeChar(char);
                if (normalizedChar >= 'A' && normalizedChar <= 'Z') {
                    lettersInPhrases.add(normalizedChar);
                }
            }
        });
        
        // Check each letter and mark as spun if fully revealed
        lettersInPhrases.forEach(letter => {
            if (!this.spunLetters.has(letter) && this.isLetterFullyRevealed(letter)) {
                console.log(`🧹 Game: Found fully revealed letter ${letter} not marked as spun - marking now`);
                this.spunLetters.add(letter);
            }
        });
    }

    isLetterFullyRevealed(letter) {
        // Check if ALL instances of this letter are revealed by checking the DOM
        // Returns true if the letter has no hidden instances, false otherwise
        
        // Check all rows for any hidden instances of this letter
        for (let rowNum = 1; rowNum <= this.rowLengths.length; rowNum++) {
            const row = document.getElementById(`row${rowNum}`);
            if (!row) continue;
            
            // Find all letter blocks with this letter
            const allBlocks = row.querySelectorAll(`.letter-block[data-letter="${letter}"]`);
            
            for (const block of allBlocks) {
                // Skip spaces, buffers, and unused blocks
                if (block.classList.contains('space') || 
                    block.classList.contains('buffer') || 
                    block.classList.contains('unused')) {
                    continue;
                }
                
                // If we find even one hidden instance, the letter is not fully revealed
                if (block.classList.contains('hidden')) {
                    return false;
                }
            }
        }
        
        // No hidden instances found - letter is fully revealed
        return true;
    }

    checkGameComplete() {
        const totalLetters = this.phrases.reduce((sum, phrase) => sum + phrase.text.replace(/\s/g, '').length, 0);
        const revealedCount = this.revealedLetters.size;
        
        if (revealedCount >= totalLetters) {
            setTimeout(() => {
                alert('Congratulations! All letters have been revealed!');
            }, 500);
        }
    }
}

// Initialize the wheel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wheel = new WheelOfFortune();
});
