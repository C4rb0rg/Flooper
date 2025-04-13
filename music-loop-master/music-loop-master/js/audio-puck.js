/**
 * audio-puck.js
 * Defines the AudioPuck class for managing individual audio sources.
 * Depends on global variables/objects: Tone, canvas, corners, isTransportRunning, hoveredPuckIndex (defined in main.js)
 */

class AudioPuck {
    constructor(index, audioUrl, filename, isRecorded = false) {
        // console.log(`Creating AudioPuck ${index + 1}: ${filename}`); // Keep logging minimal
        this.index = index; // Store initial index (might not be current array index later)
        this.url = audioUrl;
        this.filename = filename;
        this.isRecorded = isRecorded;
        const initialX = (canvas?.width / 2 || 300) + (Math.random() - 0.5) * 100;
        const initialY = (canvas?.height / 2 || 300) + (Math.random() - 0.5) * 100;
        this.x = initialX;
        this.y = initialY;
        this.radius = 20;
        this.isPlaying = false;
        this.isLoaded = false;
        this.loadError = false;
        this.volumeValue = 0;
        this.deleteButtonRadius = 8; // Radius of the delete 'X' clickable area
        // Delete button offset calculation moved to getDeleteButtonPosition

        try {
            // --- Initialize Tone.js Nodes ---
            this.delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.5, wet: 0 });
            this.reverb = new Tone.Reverb({ decay: 2, wet: 0 });
            this.distortion = new Tone.Distortion({ distortion: 0.6, wet: 0 });
            this.eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
            this.volume = new Tone.Volume(this.volumeValue).toDestination();

            this.reverb.generate().then(() => {
                // console.log(`Reverb generated for Puck ${this.index + 1}`); // Less verbose
            }).catch(err => {
                console.error(`Reverb generation failed for Puck ${pucks.indexOf(this) + 1}:`, err); // Use current index
            });

            // --- Initialize Tone.Player ---
            this.player = new Tone.Player({
                url: this.url,
                autostart: false,
                loop: true,
                fadeIn: 0.1,
                fadeOut: 0.1,
                onload: () => {
                    console.log(`Puck ${pucks.indexOf(this) + 1} (${this.filename}) loaded successfully.`); // Use current index
                    this.isLoaded = true;
                    this.loadError = false;
                    if (typeof isTransportRunning !== 'undefined' && isTransportRunning && Tone.Transport.state === 'started') {
                        this.player.sync().start(0);
                        this.isPlaying = true;
                    }
                },
                onerror: (error) => {
                    console.error(`Error loading audio for Puck ${pucks.indexOf(this) + 1} (${this.filename}):`, error); // Use current index
                    this.loadError = true;
                    this.isLoaded = false;
                    alert(`Error loading: ${this.filename}. Unsupported format or network issue? Check console.`);
                }
            }).chain(this.delay, this.reverb, this.distortion, this.eq, this.volume);

            this.repeatLoop = null;
            this.updateEffects();
            // console.log(`AudioPuck ${index + 1} setup complete.`);

        } catch (error) {
            const currentIdx = typeof pucks !== 'undefined' ? pucks.indexOf(this) : index; // Try to get current index
            console.error(`FATAL: Error during AudioPuck ${currentIdx + 1} (${filename}) constructor:`, error);
            this.loadError = true;
            alert(`Failed to initialize audio components for ${filename}.`);
        }
    }

    /** Calculates the current position of the delete button */
    getDeleteButtonPosition() {
        // Calculate offset based on current radius dynamically
        const offsetX = this.radius * 0.707; // Cos(45) or Sin(45)
        const offsetY = -this.radius * 0.707; // Negative Y for top-right
        return {
            x: this.x + offsetX,
            y: this.y + offsetY
        };
    }

    /** Draws the puck and potentially the delete button */
    draw(ctx) {
        if (!ctx) return;
        ctx.save();

        // Determine glow
        let glowColor = 'transparent', glowBlur = 0;
        if (this.loadError) { glowColor = 'rgba(255, 255, 0, 0.9)'; glowBlur = 15; }
        else if (!this.isLoaded) { glowColor = 'rgba(200, 200, 200, 0.5)'; glowBlur = 10; }
        else if (this.isRecorded) { glowColor = 'rgba(255, 80, 80, 0.8)'; glowBlur = 18; }
        else { glowColor = this.isPlaying ? 'rgba(108, 99, 255, 0.9)' : 'rgba(108, 99, 255, 0.6)'; glowBlur = 15; }
        ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur;

        // Determine fill
        const puckColorPlaying = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#6c63ff';
        const puckColorStopped = 'rgba(240, 240, 240, 0.85)';
        let currentFill = this.isPlaying ? puckColorPlaying : puckColorStopped;
        if (this.loadError) { currentFill = 'rgba(255, 180, 0, 0.8)'; }
        else if (!this.isLoaded) { currentFill = 'rgba(150, 150, 150, 0.7)'; }

        // Draw circle
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = currentFill; ctx.fill();

        // Draw text (Uses current position in global 'pucks' array for index)
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.fillStyle = this.isPlaying ? 'white' : (this.loadError || !this.isLoaded ? 'white' : 'black');
        ctx.font = `bold ${Math.max(10, this.radius * 0.6)}px Poppins`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const displayIndex = (typeof pucks !== 'undefined' ? pucks.indexOf(this) : -1) + 1;
        if (displayIndex > 0) { ctx.fillText(displayIndex, this.x, this.y); }
        else { ctx.fillText('?', this.x, this.y); } // Fallback if not found in array

        // Draw Hover Text & Delete Button
        const currentHoverIndex = typeof hoveredPuckIndex !== 'undefined' ? hoveredPuckIndex : null;
        const currentArrayIndex = typeof pucks !== 'undefined' ? pucks.indexOf(this) : -1;
        if (currentHoverIndex === currentArrayIndex && currentArrayIndex !== -1) {
            // Draw hover text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.font = '12px Poppins'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            let stateText = this.isPlaying ? 'Playing' : 'Stopped';
            if (this.loadError) stateText = 'Load Error!'; else if (!this.isLoaded) stateText = 'Loading...';
            const displayName = this.filename.length > 25 ? this.filename.substring(0, 22) + '...' : this.filename;
            ctx.fillText(`${displayName} (${stateText})`, this.x + this.radius + 8, this.y + this.radius + 4);
            // Draw delete button only when hovered
            this.drawDeleteButton(ctx);
        }
        ctx.restore();
    }

    /** Draws the delete 'X' button */
    drawDeleteButton(ctx) {
        const pos = this.getDeleteButtonPosition();
        const r = this.deleteButtonRadius;
        const crossSize = r * 0.5;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200, 0, 0, 0.7)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(pos.x - crossSize, pos.y - crossSize); ctx.lineTo(pos.x + crossSize, pos.y + crossSize);
        ctx.moveTo(pos.x + crossSize, pos.y - crossSize); ctx.lineTo(pos.x - crossSize, pos.y + crossSize); ctx.stroke();
    }

    /** Checks if the given mouse coordinates hit the delete button area */
    isDeleteHit(mx, my) {
        const pos = this.getDeleteButtonPosition();
        const dx = mx - pos.x;
        const dy = my - pos.y;
        const hit = (dx * dx + dy * dy) <= (this.deleteButtonRadius * this.deleteButtonRadius);
        // console.log(`isDeleteHit check for Puck ${pucks.indexOf(this) + 1}: Click=(${mx.toFixed(1)}, ${my.toFixed(1)}), ButtonCenter=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), Radius=${this.deleteButtonRadius}, Hit=${hit}`);
        return hit;
    }

    /** Checks if the given mouse coordinates are inside the main puck body */
    isHit(mx, my) {
        const dx = mx - this.x; const dy = my - this.y; return (dx * dx + dy * dy) <= (this.radius * this.radius);
    }

    /** Updates the wet levels of effects based on the puck's position */
    updateEffects() {
        // --- Existing logic ---
        if (!this.isLoaded || this.loadError) { this.delay.wet.value = 0; this.reverb.wet.value = 0; this.distortion.wet.value = 0; this.eq.low.value = 0; return; }
        const d = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y); const currentWidth = canvas?.width || window.innerWidth; const currentHeight = canvas?.height || window.innerHeight; const maxDist = Math.hypot(currentWidth, currentHeight); if (maxDist === 0) return;
        const delayProx = 1 - Math.min(d(this, corners.delay) / maxDist, 1); const reverbProx = 1 - Math.min(d(this, corners.reverb) / maxDist, 1); const distortionProx = 1 - Math.min(d(this, corners.distortion) / maxDist, 1); const eqProx = 1 - Math.min(d(this, corners.eq) / maxDist, 1);
        this.delay.wet.linearRampToValueAtTime(delayProx * 0.5, Tone.now() + 0.05); this.reverb.wet.linearRampToValueAtTime(reverbProx, Tone.now() + 0.05); this.distortion.wet.linearRampToValueAtTime(distortionProx * 0.5, Tone.now() + 0.05); const eqDB = (eqProx - 0.5) * 24; this.eq.low.linearRampToValueAtTime(eqDB, Tone.now() + 0.05);
    }

    /** Toggles an 8th note beat repeat loop */
    toggleRepeat() {
        // --- Existing logic ---
        if (!this.isLoaded || this.loadError) { return; } if (this.repeatLoop) { this.repeatLoop.dispose(); this.repeatLoop = null; console.log(`Puck ${pucks.indexOf(this) + 1}: Beat repeat OFF`); } else { console.log(`Puck ${pucks.indexOf(this) + 1}: Enabling beat repeat (8n)`); this.repeatLoop = new Tone.Loop((time) => { this.player.seek(0, time); if (this.player.state !== 'started' && this.isPlaying) { this.player.start(time); } }, '8n').start(0); }
    }

    /** Adjusts volume and updates radius */
    setVolume(delta) {
        // --- Existing logic ---
        const dbChange = delta < 0 ? 2 : -2; const currentVol = this.volumeValue; this.volumeValue = Math.max(-48, Math.min(6, currentVol + dbChange)); if (currentVol !== this.volumeValue) { /* console.log(`Puck ${pucks.indexOf(this) + 1}: Setting volume...`); */ } if (this.isLoaded && Tone.context.state === 'running') { this.volume.volume.linearRampToValueAtTime(this.volumeValue, Tone.now() + 0.05); } else { this.volume.volume.value = this.volumeValue; } const minVol = -48; const maxVol = 6; const minRadius = 12; const maxRadius = 35; const norm = (this.volumeValue - minVol) / (maxVol - minVol); this.radius = minRadius + Math.max(0, Math.min(1, norm)) * (maxRadius - minRadius);
    }

    /** Cleanly dispose of all Tone.js resources associated with this puck */
    dispose() {
        const currentIndex = typeof pucks !== 'undefined' ? pucks.indexOf(this) : -1; // Get current index for logging
        console.log(`Disposing Puck index ${currentIndex}`);
        if (this.player) {
            this.player.stop(); // Stop playback
            this.player.unsync(); // Unsync from transport
            this.player.dispose(); // Dispose player node
        }
        if (this.repeatLoop) {
            this.repeatLoop.dispose(); // Dispose loop object
        }
        // Dispose effect nodes
        if (this.delay) this.delay.dispose();
        if (this.reverb) this.reverb.dispose();
        if (this.distortion) this.distortion.dispose();
        if (this.eq) this.eq.dispose();
        if (this.volume) this.volume.dispose(); // Dispose volume node

        // --- DO NOT REVOKE BLOB URL IF UNDO IS NEEDED ---
        // if (this.url && this.url.startsWith('blob:')) {
        //     console.log(`Revoking blob URL: ${this.url}`); // Keep this log if you uncomment
        //     URL.revokeObjectURL(this.url); // Commented out/Removed for Undo
        // }
        // --- END OF CHANGE ---

        // Clear references to prevent memory leaks
        this.player = null;
        this.repeatLoop = null;
        this.delay = null;
        this.reverb = null;
        this.distortion = null;
        this.eq = null;
        this.volume = null;
        console.log(`Finished disposing Puck index ${currentIndex}`);
    }

} // End of AudioPuck Class