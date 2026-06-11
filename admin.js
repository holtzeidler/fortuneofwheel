class WheelOfFortuneAdmin {
    constructor() {
        this.phrases = [];
        this.rowLengths = [13, 15, 15, 15, 15, 15, 15, 15, 13];
        this.initializeEventListeners();
        this.createAlphabetGrid();
        this.updateGameStatus();
        
        // Load any existing phrases from storage
        this.loadFromStorage();
    }

    forceClearAllStorage() {
        // Force clear ALL storage and start completely fresh
        console.log('🧹 Admin: Force clearing all storage...');
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Also clear any other potential storage keys
        const keysToRemove = [
            'wheelOfFortunePhrases',
            'wheelOfFortuneGameState',
            'wheelOfFortuneAdminInitialized',
            'wheelOfFortuneRevealedLetters',
            'wheelOfFortuneSpunLetters',
            'wheelOfFortuneLastSpunLetter',
            'wheelOfFortuneLetterInstances',
            'wheelOfFortuneCurrentRotation',
            'wheelOfFortuneTargetRotation'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Clear any indexedDB if it exists
        if ('indexedDB' in window) {
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    if (db.name.includes('wheel') || db.name.includes('fortune')) {
                        indexedDB.deleteDatabase(db.name);
                        console.log(`🗑️ Deleted indexedDB: ${db.name}`);
                    }
                });
            }).catch(err => console.log('No indexedDB to clear'));
        }
        
        this.phrases = [];
        this.updatePhraseList();
        this.updateWordRevealTable();
        this.updateSpaceInfo();
        
        console.log('✅ All storage cleared - fresh start!');
    }

    initializeEventListeners() {
        document.getElementById('addWordBtn').addEventListener('click', () => this.addPhrase());
        document.getElementById('wordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPhrase();
        });
        document.getElementById('wordInput').addEventListener('input', () => this.updateSpaceInfo());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllPhrases());
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('saveToStorageBtn').addEventListener('click', () => this.saveToStorage());
        document.getElementById('loadFromStorageBtn').addEventListener('click', () => this.loadFromStorage());
        document.getElementById('resetGameBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('openGameBtn').addEventListener('click', () => this.openGame());
        // Removed revealWordBtn event listener - now using individual reveal buttons in table
        document.getElementById('clearStorageBtn').addEventListener('click', () => this.clearAllStorage());
    }

    updateSpaceInfo() {
        const input = document.getElementById('wordInput');
        const phrase = input.value.trim().toUpperCase();
        
        if (!phrase) {
            input.placeholder = 'Enter a phrase (max 15 characters)';
            return;
        }
        
        const phraseLength = phrase.length;
        
        // Find all possible placement options
        const placementOptions = [];
        
        for (let rowIndex = 0; rowIndex < this.rowLengths.length; rowIndex++) {
            const rowLength = this.rowLengths[rowIndex];
            const usedBlocks = this.getUsedBlocksInRow(rowIndex);
            const wordsInRow = this.getWordsInRow(rowIndex).length;
            
            // Calculate required blocks: if this would be the first word, need +2, otherwise +1 (shared buffer)
            const requiredBlocks = wordsInRow === 0 ? phraseLength + 2 : phraseLength + 1;
            const availableBlocks = rowLength - usedBlocks;
            
            if (availableBlocks >= requiredBlocks) {
                placementOptions.push({
                    row: rowIndex,
                    availableBlocks: availableBlocks,
                    wordsInRow: wordsInRow,
                    requiredBlocks: requiredBlocks,
                    efficiency: availableBlocks - requiredBlocks // Lower is better (less wasted space)
                });
            }
        }
        
        if (placementOptions.length > 0) {
            // Sort by efficiency (least wasted space first), then by number of words in row
            placementOptions.sort((a, b) => {
                if (a.efficiency !== b.efficiency) {
                    return a.efficiency - b.efficiency;
                }
                return a.wordsInRow - b.wordsInRow;
            });
            
            const bestOption = placementOptions[0];
            const remainingBlocks = bestOption.availableBlocks - bestOption.requiredBlocks;
            const wordCount = bestOption.wordsInRow + 1;
            
            let placeholder = `Best: Row ${bestOption.row + 1} (${bestOption.requiredBlocks} blocks needed)`;
            if (remainingBlocks > 0) {
                placeholder += ` - ${remainingBlocks} blocks left`;
            }
            if (wordCount > 1) {
                placeholder += ` - ${wordCount} words in row`;
            }
            
            input.placeholder = placeholder;
        } else {
            input.placeholder = `Too long! Need ${phraseLength + 1} blocks, max available is ${this.getMaxAvailableBlocks()}`;
        }
    }

    getMaxAvailableBlocks() {
        let maxAvailable = 0;
        for (let rowIndex = 0; rowIndex < this.rowLengths.length; rowIndex++) {
            const rowLength = this.rowLengths[rowIndex];
            const usedBlocks = this.getUsedBlocksInRow(rowIndex);
            const availableBlocks = rowLength - usedBlocks;
            maxAvailable = Math.max(maxAvailable, availableBlocks);
        }
        return maxAvailable;
    }

    getWordsInRow(rowIndex) {
        return this.phrases.filter(phrase => phrase.row === rowIndex);
    }

    addPhrase() {
        const input = document.getElementById('wordInput');
        const phrase = input.value.trim().toUpperCase();
        
        if (!phrase) {
            alert('Please enter a phrase!');
            return;
        }
        
        if (this.phrases.some(p => p.text === phrase)) {
            alert('This phrase is already on the board!');
            return;
        }
        
        if (phrase.length > 15) {
            alert('Phrase must be 15 characters or less!');
            return;
        }
        
        // Check if phrase can fit in any row
        const canFit = this.canPhraseFit(phrase);
        if (!canFit.canFit) {
            alert(`Cannot add "${phrase}" - ${canFit.reason}`);
            return;
        }
        
        // Add phrase to the appropriate row
        this.phrases.push({
            text: phrase,
            row: canFit.row,
            position: canFit.position
        });
        
        this.addPhraseToList(phrase, canFit.row, canFit.position);
        input.value = '';
        input.placeholder = 'Enter a phrase (max 15 characters)';
        this.updateWordRevealTable();
        this.updateGameStatus();
        this.updateSpaceInfo();
        this.saveToStorage();
    }

    canPhraseFit(phrase) {
        const phraseLength = phrase.length;
        
        // Find all possible placement options
        const placementOptions = [];
        
        for (let rowIndex = 0; rowIndex < this.rowLengths.length; rowIndex++) {
            const rowLength = this.rowLengths[rowIndex];
            const usedBlocks = this.getUsedBlocksInRow(rowIndex);
            const wordsInRow = this.getWordsInRow(rowIndex).length;
            
            // Calculate required blocks: if this would be the first word, need +2, otherwise +1 (shared buffer)
            const requiredBlocks = wordsInRow === 0 ? phraseLength + 2 : phraseLength + 1;
            const availableBlocks = rowLength - usedBlocks;
            
            if (availableBlocks >= requiredBlocks) {
                placementOptions.push({
                    row: rowIndex,
                    availableBlocks: availableBlocks,
                    wordsInRow: wordsInRow,
                    requiredBlocks: requiredBlocks,
                    efficiency: availableBlocks - requiredBlocks // Lower is better (less wasted space)
                });
            }
        }
        
        if (placementOptions.length > 0) {
            // Sort by efficiency (least wasted space first), then by number of words in row
            placementOptions.sort((a, b) => {
                if (a.efficiency !== b.efficiency) {
                    return a.efficiency - b.efficiency;
                }
                return a.wordsInRow - b.wordsInRow;
            });
            
            const bestOption = placementOptions[0];
            const wordCount = bestOption.wordsInRow + 1;
            
            return {
                canFit: true,
                row: bestOption.row,
                position: this.getNextPositionInRow(bestOption.row),
                reason: `Fits in row ${bestOption.row + 1} (${wordCount} words in row)`
            };
        }
        
        return {
            canFit: false,
            reason: `No row has enough space. Need ${phraseLength + (this.phrases.some(p => p.row === 0) ? 1 : 2)} blocks (${phraseLength} for phrase + buffer)`
        };
    }

    getUsedBlocksInRow(rowIndex) {
        const wordsInRow = this.getWordsInRow(rowIndex);
        if (wordsInRow.length === 0) {
            return 0;
        }
        
        // First word needs: 1 start buffer + word length + 1 end buffer = word.length + 2
        // Additional words need: 1 shared buffer (with previous word) + word length + 1 end buffer = word.length + 1
        let usedBlocks = 0;
        wordsInRow.forEach((phrase, index) => {
            if (index === 0) {
                // First word: needs start buffer + word + end buffer
                usedBlocks += phrase.text.length + 2;
            } else {
                // Subsequent words: share buffer with previous word, so only need word + end buffer
                usedBlocks += phrase.text.length + 1;
            }
        });
        
        return usedBlocks;
    }

    getNextPositionInRow(rowIndex) {
        const wordsInRow = this.getWordsInRow(rowIndex);
        if (wordsInRow.length === 0) {
            return 0; // First word starts at position 0
        }
        
        // Calculate the actual block position based on all words in the row
        // First word: 1 (start buffer) + word length + 1 (end buffer)
        // Subsequent words: 1 (shared buffer) + word length + 1 (end buffer)
        let totalBlocks = 0;
        wordsInRow.forEach((phrase, index) => {
            if (index === 0) {
                totalBlocks += 1 + phrase.text.length + 1; // start buffer + word + end buffer
            } else {
                totalBlocks += 1 + phrase.text.length + 1; // shared buffer + word + end buffer
            }
        });
        
        // The next position would be after all current blocks
        // But since position is just for tracking, we can return the total blocks used
        // The actual placement in createGameBoard handles buffers automatically
        return totalBlocks;
    }

    addPhraseToList(phrase, row, position) {
        const wordList = document.getElementById('wordList');
        const wordItem = document.createElement('div');
        wordItem.className = 'word-item';
        
        // Count words in this row
        const wordsInRow = this.getWordsInRow(row).length;
        const rowLength = this.rowLengths[row];
        const usedBlocks = this.getUsedBlocksInRow(row);
        const availableBlocks = rowLength - usedBlocks;
        
        wordItem.innerHTML = `
            <span>${phrase} (Row ${row + 1}, Pos ${position + 1})</span>
            <span class="row-info">${wordsInRow} word${wordsInRow > 1 ? 's' : ''}, ${availableBlocks} blocks left</span>
            <button class="remove-word" onclick="admin.removePhrase('${phrase}')">×</button>
        `;
        wordList.appendChild(wordItem);
    }

    removePhrase(phrase) {
        const index = this.phrases.findIndex(p => p.text === phrase);
        if (index > -1) {
            this.phrases.splice(index, 1);
            this.updatePhraseList();
            this.updateWordRevealTable();
            this.updateGameStatus();
            this.updateSpaceInfo();
            this.saveToStorage();
        }
    }

    updatePhraseList() {
        const wordList = document.getElementById('wordList');
        wordList.innerHTML = '';
        this.phrases.forEach(phrase => {
            this.addPhraseToList(phrase.text, phrase.row, phrase.position);
        });
    }

    updateWordRevealTable() {
        const tableBody = document.getElementById('wordRevealTableBody');
        tableBody.innerHTML = '';
        
        this.phrases.forEach((phrase, index) => {
            const row = document.createElement('tr');
            row.className = 'word-reveal-row';
            
            row.innerHTML = `
                <td>Row ${phrase.row + 1}</td>
                <td>${phrase.text}</td>
                <td>${phrase.position + 1}</td>
                <td>
                    <button class="reveal-word-btn" onclick="admin.revealWordByIndex(${index})">
                        🔍 Reveal
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    clearAllPhrases() {
        this.phrases = [];
        this.updatePhraseList();
        this.updateWordRevealTable();
        this.updateGameStatus();
        this.updateSpaceInfo();
        this.saveToStorage();
    }

    clearAllStorage() {
        if (confirm('Are you sure you want to clear ALL storage? This will remove all phrases and game state.')) {
            console.log('🧹 Admin: Manually clearing all storage...');
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear any indexedDB if it exists
            if ('indexedDB' in window) {
                indexedDB.databases().then(databases => {
                    databases.forEach(db => {
                        if (db.name.includes('wheel') || db.name.includes('fortune')) {
                            indexedDB.deleteDatabase(db.name);
                            console.log(`🗑️ Deleted indexedDB: ${db.name}`);
                        }
                    });
                }).catch(err => console.log('No indexedDB to clear'));
            }
            
            // Reset phrases array
            this.phrases = [];
            this.updatePhraseList();
            this.updateWordRevealTable();
            this.updateGameStatus();
            this.updateSpaceInfo();
            
            // Reset version marker to force fresh start
            localStorage.setItem('wheelOfFortuneVersion', '1.0.0');
            
            alert('All storage has been cleared! You can now start fresh.');
            console.log('✅ All storage manually cleared');
        }
    }

    newGame() {
        if (this.phrases.length === 0) {
            alert('Please add some phrases first!');
            return;
        }
        
        // Send message to game window to reset
        if (window.gameWindow && !window.gameWindow.closed) {
            window.gameWindow.postMessage({action: 'newGame'}, '*');
        }
        
        this.updateGameStatus();
        alert('New game started! The game board has been reset.');
    }

    resetGame() {
        if (this.phrases.length === 0) {
            alert('Please add some phrases first!');
            return;
        }
        
        // Send message to game window to reset
        if (window.gameWindow && !window.gameWindow.closed) {
            window.gameWindow.postMessage({action: 'resetGame'}, '*');
        }
        
        this.updateGameStatus();
        alert('Game reset! All letters are hidden again.');
    }

    revealWordByIndex(index) {
        const phrase = this.phrases[index];
        
        console.log(`🔧 Admin: Attempting to reveal word "${phrase.text}" at index ${index}`);
        console.log(`🔧 Admin: Row: ${phrase.row}, Phrase: ${phrase.text}`);
        
        // Send message to game window to reveal word
        if (window.gameWindow && !window.gameWindow.closed) {
            console.log(`🔧 Admin: Game window is open, sending message...`);
            
            const message = {
                action: 'revealWord',
                rowIndex: phrase.row,
                phrase: phrase.text
            };
            
            console.log(`🔧 Admin: Sending message:`, message);
            window.gameWindow.postMessage(message, '*');
            
            document.getElementById('revealStatus').textContent = `Revealed: ${phrase.text}`;
            
            // Update the button to show it's been revealed
            const button = document.querySelector(`#wordRevealTableBody tr:nth-child(${index + 1}) .reveal-word-btn`);
            if (button) {
                button.textContent = '✅ Revealed';
                button.disabled = true;
                button.style.background = '#28a745';
            }
            
            console.log(`🔧 Admin: Message sent, button updated`);
            alert(`Word "${phrase.text}" has been revealed on the game board!`);
        } else {
            console.log(`🔧 Admin: Game window is not open or closed`);
            alert('Please open the game first!');
        }
    }

    openGame() {
        if (this.phrases.length === 0) {
            alert('Please add some phrases first before opening the game!');
            return;
        }
        
        // Set a flag that the admin has been properly initialized
        localStorage.setItem('wheelOfFortuneAdminInitialized', 'true');
        
        window.gameWindow = window.open('index.html', '_blank');
        this.updateGameStatus();
    }

    saveToStorage() {
        localStorage.setItem('wheelOfFortunePhrases', JSON.stringify(this.phrases));
        alert('Phrases saved to storage!');
    }

    loadFromStorage() {
        const saved = localStorage.getItem('wheelOfFortunePhrases');
        if (saved) {
            this.phrases = JSON.parse(saved);
            this.updatePhraseList();
            this.updateWordRevealTable();
            this.updateGameStatus();
            this.updateSpaceInfo();
            alert('Phrases loaded from storage!');
        } else {
            alert('No saved phrases found!');
        }
    }

    updateGameStatus() {
        const status = document.getElementById('gameStatus');
        if (this.phrases.length === 0) {
            status.textContent = 'No phrases added. Add some phrases to start!';
        } else {
            const totalLetters = this.phrases.reduce((sum, phrase) => sum + phrase.text.replace(/\s/g, '').length, 0);
            
            // Add row usage summary
            let rowSummary = '';
            for (let i = 0; i < this.rowLengths.length; i++) {
                const wordsInRow = this.getWordsInRow(i).length;
                const usedBlocks = this.getUsedBlocksInRow(i);
                const totalBlocks = this.rowLengths[i];
                const availableBlocks = totalBlocks - usedBlocks;
                
                if (wordsInRow > 0) {
                    rowSummary += `Row ${i + 1}: ${wordsInRow} word${wordsInRow > 1 ? 's' : ''} (${usedBlocks}/${totalBlocks} blocks)`;
                    if (i < this.rowLengths.length - 1) rowSummary += ' | ';
                }
            }
            
            status.innerHTML = `
                <div>Game Ready! ${this.phrases.length} phrases loaded (${totalLetters} total letters)</div>
                ${rowSummary ? `<div style="margin-top: 8px; font-size: 0.9rem; color: #6c757d;">${rowSummary}</div>` : ''}
            `;
        }
    }
}

// Initialize the admin panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new WheelOfFortuneAdmin();
});
