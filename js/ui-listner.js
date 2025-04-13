/**
 * ui-listeners.js
 * Attaches event listeners for UI elements (buttons, canvas).
 * Depends on global variables/objects: Tone, AudioPuck, canvas, pucks,
 * draggingPuckIndex, hoveredPuckIndex, isTransportRunning, isRecording,
 * mediaRecorder, recordedChunks (defined in main.js)
 * Depends on global functions: getMousePos, deletePuck, undoDeletePuck (defined in main.js or here)
 */

// --- Helper Function --- (Moved here as it's only used by canvas listeners)
/**
 * Calculates mouse coordinates relative to the top-left corner of the canvas element.
 * @param {MouseEvent} e - The mouse event object.
 * @returns {object} - An object {x, y} containing the relative coordinates.
 */
function getMousePos(e) {
    // Access global canvas
    if (!canvas) {
        console.error("getMousePos called but canvas element is missing.");
        return { x: 0, y: 0 };
    }
    try {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    } catch (error) {
        console.error("Error getting canvas bounding rectangle in getMousePos:", error);
        return { x: 0, y: 0 };
    }
}


// --- Event Listener Setup Function ---
function attachUIListeners() {
    console.log("Attaching UI event listeners...");

    // Get UI elements safely
    const playToggleButton = document.getElementById('play-toggle');
    const beatRepeatButton = document.getElementById('beat-repeat');
    const fileInputElement = document.getElementById('file-input');
    const recordButton = document.getElementById('record-btn');
    const undoDeleteButton = document.getElementById('undo-delete-btn'); // Get Undo button
    // Access global canvas defined in main.js
    // const canvas = document.getElementById('xy-pad'); // Already defined globally

    // --- Play/Toggle Button Listener ---
    if (playToggleButton) {
        playToggleButton.addEventListener('click', async () => {
            console.log("Play/Toggle button clicked.");
            try {
                // Ensure audio context is running
                if (Tone.context.state !== 'running') {
                    console.log("Audio context suspended, attempting to resume via Tone.start()...");
                    await Tone.start();
                    console.log("Tone.start() potentially resumed context. New state:", Tone.context.state);
                }
                if (Tone.context.state !== 'running') {
                    alert("Audio context could not be started. Please interact with the page (click/touch anywhere) and try the play button again.");
                    return;
                }
            } catch (e) {
                console.error("Error starting/resuming Tone.context:", e);
                alert("An error occurred while trying to initialize the audio system. Please refresh the page or check browser permissions.");
                return;
            }

            const playToggleIcon = playToggleButton.querySelector('i');
            // Access global pucks, isTransportRunning
            const operationalPucks = pucks.filter(p => p.isLoaded && !p.loadError);

            if (Tone.Transport.state !== 'started') { // Start Playback
                if (operationalPucks.length > 0) {
                    console.log(`Attempting to start playback for ${operationalPucks.length} operational pucks.`);
                    operationalPucks.forEach(p => {
                        console.log(`Syncing and Scheduling Puck ${pucks.indexOf(p) + 1} to start at time 0`); // Use current index for logging
                        p.player.sync().start(0); // Schedule start
                        p.isPlaying = true;
                    });
                    Tone.Transport.start(Tone.now() + 0.1);
                    console.log("Tone.Transport started.");
                    isTransportRunning = true; // Modify global state
                    if (playToggleIcon) {
                        playToggleIcon.classList.remove('fa-play');
                        playToggleIcon.classList.add('fa-pause');
                    }
                } else {
                    let message = "No audio tracks loaded to play.";
                    if (pucks.length > 0) message = "Audio tracks are still loading or encountered errors. Cannot start playback yet.";
                    console.log(message); alert(message);
                }
            } else { // Stop Playback
                console.log("Attempting to stop playback.");
                Tone.Transport.stop();
                pucks.forEach(p => { p.isPlaying = false; });
                console.log("Tone.Transport stopped.");
                isTransportRunning = false; // Modify global state
                if (playToggleIcon) {
                    playToggleIcon.classList.remove('fa-pause');
                    playToggleIcon.classList.add('fa-play');
                }
            }
        });
        console.log("Play/Toggle listener attached.");
    } else { console.error("Play/Toggle button ('#play-toggle') element not found!"); }

    // --- Beat Repeat Button Listener ---
    if (beatRepeatButton) {
        beatRepeatButton.addEventListener('click', () => {
            console.log("Beat Repeat button clicked.");
            // Access global pucks
            if (pucks.length > 0) {
                pucks.forEach(p => p.toggleRepeat());
            } else {
                console.log("No pucks available to apply beat repeat effect.");
            }
        });
        console.log("Beat Repeat listener attached.");
    } else { console.error("Beat Repeat button ('#beat-repeat') element not found!"); }

    // --- File Input Listener ---
    if (fileInputElement) {
        fileInputElement.addEventListener('change', function (event) {
            const files = event.target.files;
            if (!files || files.length === 0) {
                console.log("File input change event fired, but no files selected."); return;
            }
            console.log(`File input change: ${files.length} file(s) selected.`);

            Array.from(files).forEach((file) => {
                const url = URL.createObjectURL(file);
                console.log(`Created blob URL for ${file.name}: ${url}`);
                try {
                    // Access global pucks array and AudioPuck class
                    // Pass the current length as the initial index for the new puck
                    const newPuck = new AudioPuck(pucks.length, url, file.name, false);
                    pucks.push(newPuck); // Modify global state
                    console.log(`Puck ${pucks.length} instance created for ${file.name}. Loading initiated.`); // Log length AFTER push
                } catch (creationError) {
                    console.error(`Error creating AudioPuck instance for ${file.name}:`, creationError);
                    URL.revokeObjectURL(url);
                }
            });
            event.target.value = null;
        });
        console.log("File Input listener attached.");
    } else { console.error("File input element ('#file-input') not found!"); }

    // --- Record Button Listener ---
    if (recordButton) {
        recordButton.addEventListener('click', async () => {
            console.log("Record button clicked. Current state:", isRecording ? "Recording" : "Idle");
            const icon = recordButton.querySelector('i');
            let stream = null; // Local stream variable for this handler

            // Access global isRecording flag
            if (!isRecording) { // Start Recording
                console.log("Attempting to start recording...");
                try {
                    if (Tone.context.state !== 'running') {
                        console.log("Audio context suspended, attempting to resume for recording...");
                        await Tone.start();
                    }
                    if (Tone.context.state !== 'running') {
                        alert("Audio context could not be started. Cannot record audio."); return;
                    }

                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    console.log("Microphone stream obtained successfully.");

                    const options = { mimeType: 'audio/webm' };
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.warn(`${options.mimeType} not supported, trying audio/ogg`);
                        options.mimeType = 'audio/ogg';
                        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                            console.warn(`${options.mimeType} also not supported, using browser default.`);
                            delete options.mimeType;
                        }
                    }
                    console.log("Using MediaRecorder options:", options);

                    // Assign to global mediaRecorder, recordedChunks
                    mediaRecorder = new MediaRecorder(stream, options);
                    recordedChunks = [];

                    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) { recordedChunks.push(e.data); } };

                    mediaRecorder.onstop = () => {
                        console.log("MediaRecorder stopped. Processing recording...");
                        const stopTracks = () => { if (stream?.getTracks) stream.getTracks().forEach(track => track.stop()); console.log("Microphone stream tracks stopped."); };
                        if (recordedChunks.length === 0) {
                            console.error("No data recorded."); alert("Recording failed: No audio data was captured.");
                            stopTracks(); isRecording = false; // Reset global state
                            if (icon) { icon.classList.remove('fa-stop'); icon.classList.add('fa-microphone'); }
                            recordButton.classList.remove('recording'); recordButton.dataset.tooltip = "Record Mic";
                            return;
                        }
                        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                        const url = URL.createObjectURL(blob);
                        console.log(`Created blob URL for recording: ${url}, Size: ${blob.size}, Type: ${blob.type}`);
                        try {
                            // Access global pucks, AudioPuck
                            const puckIndex = pucks.length; // Initial index for new puck
                            const puckFilename = `Mic Recording ${puckIndex + 1}`;
                            const newPuck = new AudioPuck(puckIndex, url, puckFilename, true);
                            pucks.push(newPuck); // Modify global state
                            console.log(`Puck ${pucks.length} instance created for Recording.`); // Log length AFTER push
                            stopTracks();
                        } catch (creationError) {
                            console.error("Error creating AudioPuck instance for recording:", creationError);
                            alert("Failed to create the audio puck from the recording.");
                            URL.revokeObjectURL(url); stopTracks();
                        }
                    };

                    mediaRecorder.onerror = (event) => {
                        console.error("MediaRecorder Error:", event.error);
                        alert(`An error occurred during recording: ${event.error.name} - ${event.error.message}`);
                        isRecording = false; // Reset global state
                        if (icon) { icon.classList.remove('fa-stop'); icon.classList.add('fa-microphone'); }
                        recordButton.classList.remove('recording'); recordButton.dataset.tooltip = "Record Mic";
                        if (stream?.getTracks) stream.getTracks().forEach(track => track.stop());
                    };

                    mediaRecorder.start();
                    console.log("MediaRecorder started successfully.");
                    isRecording = true; // Modify global state
                    recordButton.classList.add('recording');
                    if (icon) { icon.classList.remove('fa-microphone'); icon.classList.add('fa-stop'); }
                    recordButton.dataset.tooltip = "Stop Recording";

                } catch (err) {
                    console.error("Error accessing/starting microphone:", err);
                    let message = `Could not access microphone: ${err.message}.`;
                    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") message += " Please grant microphone permission.";
                    else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") message += " No microphone detected.";
                    else if (err.name === "NotReadableError" || err.name === "TrackStartError") message += " Microphone might be in use.";
                    alert(message);
                    isRecording = false; // Modify global state
                    if (icon) { icon.classList.remove('fa-stop'); icon.classList.add('fa-microphone'); }
                    recordButton.classList.remove('recording'); recordButton.dataset.tooltip = "Record Mic";
                }
            } else { // Stop Recording
                // Access global mediaRecorder
                if (mediaRecorder && mediaRecorder.state === "recording") {
                    console.log("Stopping MediaRecorder...");
                    mediaRecorder.stop();
                } else {
                    console.log("Stop clicked, but MediaRecorder wasn't recording or ready.");
                }
                // Reset UI immediately, onstop handles data processing
                isRecording = false; // Modify global state
                if (icon) { icon.classList.remove('fa-stop'); icon.classList.add('fa-microphone'); }
                recordButton.classList.remove('recording');
                recordButton.dataset.tooltip = "Record Mic";
            }
        });
        console.log("Record button listener attached.");
    } else { console.error("Record button ('#record-btn') element not found!"); }


    // --- Undo Button Listener ---
    if (undoDeleteButton) {
        undoDeleteButton.addEventListener('click', () => {
            console.log("Undo Delete button clicked.");
            // Call global function from main.js
            if (typeof undoDeletePuck === 'function') {
                undoDeletePuck();
            } else {
                console.error("undoDeletePuck function is not defined in main.js!");
            }
        });
        console.log("Undo Delete listener attached.");
    } else { console.error("Undo Delete button ('#undo-delete-btn') element not found!"); }


    // --- Canvas Mouse Listeners ---
    if (canvas) {
        // Mouse Down: Check for delete hit FIRST, then initiate dragging
        canvas.addEventListener('mousedown', (e) => {
            if (!pucks || pucks.length === 0) return;
            const { x, y } = getMousePos(e);
            // console.log(`Canvas mousedown at (${x.toFixed(1)}, ${y.toFixed(1)}). Hovered index: ${hoveredPuckIndex}`); // Verbose

            // Check if the click hit the delete button of the hovered puck
            let deleteHit = false;
            // Access global hoveredPuckIndex, pucks
            if (hoveredPuckIndex !== null && pucks[hoveredPuckIndex]) {
                const hoveredPuck = pucks[hoveredPuckIndex];
                // console.log(`Checking delete hit for Puck index ${hoveredPuckIndex}`); // Verbose
                // Check if the specific delete button area was hit
                if (hoveredPuck.isDeleteHit && typeof hoveredPuck.isDeleteHit === 'function' && hoveredPuck.isDeleteHit(x, y)) {
                    console.log(`Delete button confirmed hit for Puck index ${hoveredPuckIndex}. Calling deletePuck...`); // Keep this log
                    if (typeof deletePuck === 'function') {
                        deletePuck(hoveredPuckIndex); // Pass the index to delete
                    } else {
                        console.error("deletePuck function is not defined in main.js!");
                    }
                    deleteHit = true;
                    // Prevent dragging from starting if delete was clicked
                    // Modify global state
                    draggingPuckIndex = null;
                    hoveredPuckIndex = null; // Clear hover after delete
                    canvas.style.cursor = 'crosshair'; // Reset cursor
                } else {
                     // console.log(`Click was NOT on delete button for Puck index ${hoveredPuckIndex}.`); // Verbose
                }
            } else if (hoveredPuckIndex !== null) {
                 // console.log(`Hovered index ${hoveredPuckIndex} exists, but puck object not found in array?`); // Verbose
            }

            // If delete wasn't hit, proceed with normal dragging logic
            if (!deleteHit) {
                // console.log("Delete not hit, checking for drag start..."); // Verbose
                // Access global pucks, modify global draggingPuckIndex
                const reversedIndex = pucks.slice().reverse().findIndex(p => p.isHit(x, y));
                if (reversedIndex !== -1) {
                    draggingPuckIndex = pucks.length - 1 - reversedIndex;
                    // console.log(`Mouse down starts dragging Puck index ${draggingPuckIndex}`); // Verbose
                    canvas.style.cursor = 'grabbing';
                } else {
                    // console.log("Mouse down missed pucks for dragging."); // Verbose
                    draggingPuckIndex = null;
                }
            }
        });

        // Mouse Move: Handle hover and dragging
        canvas.addEventListener('mousemove', (e) => {
            if (!pucks) return;
            const { x, y } = getMousePos(e);

            // Update Hover State (access global pucks, modify global hoveredPuckIndex)
            const currentReversedHoveredIndex = pucks.slice().reverse().findIndex(p => p.isHit(x, y));
            const oldHoverIndex = hoveredPuckIndex;
            hoveredPuckIndex = currentReversedHoveredIndex !== -1 ? pucks.length - 1 - currentReversedHoveredIndex : null;

            // Update cursor based on hover state (grab, delete pointer, or crosshair)
            // Access global draggingPuckIndex, hoveredPuckIndex, pucks
            if (draggingPuckIndex === null) { // Only change cursor if not dragging
                if (hoveredPuckIndex !== null && pucks[hoveredPuckIndex]?.isDeleteHit(x,y)) {
                     canvas.style.cursor = 'pointer'; // Pointer cursor over delete button
                } else if (hoveredPuckIndex !== null) {
                     canvas.style.cursor = 'grab'; // Grab cursor over puck body
                } else {
                     canvas.style.cursor = 'crosshair'; // Default cursor
                }
            }

            // Handle Puck Dragging (access global draggingPuckIndex, pucks)
            if (draggingPuckIndex !== null && pucks[draggingPuckIndex]) {
                const puck = pucks[draggingPuckIndex];
                puck.x = x; puck.y = y;
                puck.updateEffects();
                canvas.style.cursor = 'grabbing'; // Ensure cursor stays grabbing during drag
            }
        });

        // Mouse Up: Stop dragging
        canvas.addEventListener('mouseup', (event) => { // Pass event to getMousePos if needed
            // Access global draggingPuckIndex, hoveredPuckIndex, pucks
            if (draggingPuckIndex !== null) {
                // console.log(`Mouse up, stopped dragging Puck index ${draggingPuckIndex}`); // Verbose
                // Update cursor based on final hover position
                const { x, y } = getMousePos(event); // Get current position on mouseup
                if (hoveredPuckIndex !== null && pucks[hoveredPuckIndex]?.isDeleteHit(x,y)) {
                     canvas.style.cursor = 'pointer';
                 } else {
                    canvas.style.cursor = hoveredPuckIndex !== null ? 'grab' : 'crosshair';
                 }
                draggingPuckIndex = null; // Modify global state
            }
        });

        // Mouse Leave: Stop dragging, clear hover
        canvas.addEventListener('mouseleave', () => {
            // Access global draggingPuckIndex, hoveredPuckIndex
            if (draggingPuckIndex !== null) {
                 // console.log(`Mouse left canvas while dragging Puck index ${draggingPuckIndex}, stopping drag.`); // Verbose
                 draggingPuckIndex = null; // Modify global state
            }
            hoveredPuckIndex = null; // Modify global state
            canvas.style.cursor = 'crosshair';
        });

        // Mouse Wheel: Adjust volume
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            // Access global hoveredPuckIndex, pucks
            if (hoveredPuckIndex !== null && pucks[hoveredPuckIndex]) {
                pucks[hoveredPuckIndex].setVolume(e.deltaY);
            }
        }, { passive: false });

        console.log("Canvas mouse listeners updated/attached.");
    } else { console.error("XY Pad canvas element not found! Mouse listeners not attached."); }

     console.log("All UI event listeners attached/updated.");
}