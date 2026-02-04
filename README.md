# Wheel of Fortune Game

A web-based Wheel of Fortune game with an admin panel for managing phrases and game state.

## Features

- **Interactive Wheel**: Spin the wheel to reveal letters
- **Game Board**: Display phrases in a grid format
- **Admin Panel**: Manage phrases and control the game
- **Smart Storage**: Automatic storage management for deployments

## How to Play

1. **Setup**: Open the Admin Panel (`admin.html`) and add your phrases
2. **Save**: Click "Save to Storage" to store your phrases
3. **Play**: Open the game (`index.html`) and start spinning the wheel
4. **Reveal**: Letters are revealed as you spin, helping players solve the phrases

## Storage Management

### Automatic Storage Clearing
The game automatically clears storage **only when you deploy new code** by changing the version number in both HTML files:

```javascript
const currentVersion = '1.0.0'; // Change this when deploying new code
```

### Manual Storage Clearing
Use the "🧹 Clear All Storage" button in the Admin Panel when you need to:
- Reset everything to start completely fresh
- Clear corrupted game state
- Remove old phrases

### Normal Gameplay
During normal gameplay, storage is **preserved** so you can:
- Set up phrases once and play multiple games
- Keep your phrases between browser sessions
- Share the game with players without losing setup

## File Structure

- `index.html` - Main game interface
- `admin.html` - Admin panel for managing phrases
- `script.js` - Main game logic
- `admin.js` - Admin panel functionality
- `styles.css` - Game styling
- `debug.js` - Debug utilities

## Deployment

When you make changes to the code:

1. **Update the version number** in both `index.html` and `admin.html`
2. **Deploy the files**
3. **Storage will automatically clear** for the new version
4. **Players will need to set up phrases again** in the admin panel

## Browser Compatibility

- Modern browsers with ES6 support
- Local storage and session storage required
- Canvas support for the wheel animation

## Troubleshooting

- **Phrases not loading**: Check if admin panel has been opened and phrases saved
- **Game not working**: Ensure both admin and game pages are from the same version
- **Storage issues**: Use "Clear All Storage" button in admin panel
