/**
 * WQMS AUDIO ALERT ENGINE
 * Manages looping sound alerts for critical water quality events
 * Handles browser autoplay policies, multi-source alerts, muting, and cooldowns.
 */

(function (window) {
    'use strict';

    const SOUND_CANDIDATE_PATHS = [
        '../assets/sounds/mixkit-alert-bells-echo-765.wav',
        '../../assets/sounds/mixkit-alert-bells-echo-765.wav',
        '../frontend/assets/sounds/mixkit-alert-bells-echo-765.wav',
        '/WQMS/frontend/assets/sounds/mixkit-alert-bells-echo-765.wav',
        '/WQMS/assets/sounds/mixkit-alert-bells-echo-765.wav',
        'assets/sounds/mixkit-alert-bells-echo-765.wav'
    ];

    class AlertSoundManager {
        constructor() {
            this.audio = null;
            this.currentCandidateIdx = 0;
            this.isLooping = false;
            this.activeSource = null;
            this.metadata = null;
            this.silencedUntil = 0;
            this.unlocked = false;
            this.listeners = new Set();
            this.volume = 0.85;

            // Load saved mute preference
            this.muted = localStorage.getItem('wqms_sound_muted') === 'true';

            this._initAudioElement();
            this._setupGestureUnlock();
        }

        _initAudioElement() {
            try {
                this.audio = new Audio();
                this.audio.preload = 'auto';
                this.audio.loop = true;
                this.audio.volume = this.muted ? 0 : this.volume;
                this._setSource(SOUND_CANDIDATE_PATHS[this.currentCandidateIdx]);

                // Fallback to next path if loading error occurs
                this.audio.addEventListener('error', () => {
                    if (this.currentCandidateIdx < SOUND_CANDIDATE_PATHS.length - 1) {
                        this.currentCandidateIdx++;
                        console.warn('[AlertSound] Trying alternative sound path:', SOUND_CANDIDATE_PATHS[this.currentCandidateIdx]);
                        this._setSource(SOUND_CANDIDATE_PATHS[this.currentCandidateIdx]);
                    } else {
                        console.error('[AlertSound] All candidate sound paths failed to load.');
                    }
                });

                this.audio.addEventListener('play', () => {
                    this.isLooping = true;
                    this._emit();
                });

                this.audio.addEventListener('pause', () => {
                    if (!this._playPromisePending) {
                        this.isLooping = false;
                        this._emit();
                    }
                });
            } catch (err) {
                console.error('[AlertSound] Initialization error:', err);
            }
        }

        _setSource(path) {
            if (!this.audio) return;
            const fullUrl = new URL(path, window.location.href).href;
            this.audio.src = fullUrl;
        }

        _setupGestureUnlock() {
            const unlockHandler = () => {
                if (this.unlocked) return;
                this.unlock();
            };

            ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
                document.addEventListener(evt, unlockHandler, { once: true, passive: true });
            });
        }

        unlock() {
            if (this.unlocked || !this.audio) return Promise.resolve(true);

            // Prime the audio pipeline with a silent micro-play
            const prevMuted = this.audio.muted;
            this.audio.muted = true;
            return this.audio.play()
                .then(() => {
                    this.audio.pause();
                    this.audio.currentTime = 0;
                    this.audio.muted = this.muted;
                    this.unlocked = true;
                    console.log('[AlertSound] Audio unlocked successfully via user gesture.');
                    this._emit();
                    return true;
                })
                .catch(err => {
                    this.audio.muted = this.muted;
                    // Will retry on actual explicit action
                    return false;
                });
        }

        startLoop(sourceId, metadata = {}) {
            if (this.muted) {
                this.activeSource = sourceId;
                this.metadata = metadata;
                this._emit();
                return false;
            }

            // Check if silenced/snoozed
            const now = Date.now();
            if (now < this.silencedUntil) {
                this.activeSource = sourceId;
                this.metadata = metadata;
                this._emit();
                return false;
            }

            this.activeSource = sourceId;
            this.metadata = metadata;

            if (!this.audio) return false;

            this.audio.loop = true;
            this.audio.volume = this.volume;

            // If already playing smoothly, don't restart playback
            if (this.isLooping && !this.audio.paused) {
                this._emit();
                return true;
            }

            this._playPromisePending = true;
            const playPromise = this.audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this._playPromisePending = false;
                        this.isLooping = true;
                        this.unlocked = true;
                        this._emit();
                    })
                    .catch(err => {
                        this._playPromisePending = false;
                        this.isLooping = false;
                        if (err.name === 'NotAllowedError') {
                            console.warn('[AlertSound] Autoplay blocked pending user interaction.');
                        } else {
                            console.warn('[AlertSound] Audio playback failed:', err.message);
                        }
                        this._emit();
                    });
            }

            return true;
        }

        stopLoop(sourceId = null) {
            // If sourceId provided, only stop if it matches the active source
            if (sourceId && this.activeSource && sourceId !== this.activeSource) {
                return;
            }

            this.activeSource = null;
            this.metadata = null;

            if (this.audio) {
                try {
                    this.audio.pause();
                    this.audio.currentTime = 0;
                } catch (e) {}
            }
            this.isLooping = false;
            this._emit();
        }

        silence(cooldownMs = 60000) {
            this.silencedUntil = Date.now() + cooldownMs;
            if (this.audio) {
                try {
                    this.audio.pause();
                    this.audio.currentTime = 0;
                } catch (e) {}
            }
            this.isLooping = false;
            this._emit();
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('wqms_sound_muted', this.muted ? 'true' : 'false');
            if (this.audio) {
                this.audio.volume = this.muted ? 0 : this.volume;
            }
            if (this.muted && this.isLooping) {
                if (this.audio) {
                    try {
                        this.audio.pause();
                        this.audio.currentTime = 0;
                    } catch (e) {}
                }
                this.isLooping = false;
            }
            this._emit();
            return this.muted;
        }

        isMuted() {
            return this.muted;
        }

        getState() {
            return {
                isLooping: this.isLooping,
                activeSource: this.activeSource,
                metadata: this.metadata,
                muted: this.muted,
                unlocked: this.unlocked,
                silencedUntil: this.silencedUntil,
                isSilenced: Date.now() < this.silencedUntil
            };
        }

        onStateChange(fn) {
            if (typeof fn === 'function') {
                this.listeners.add(fn);
            }
            return () => this.listeners.delete(fn);
        }

        _emit() {
            const state = this.getState();
            this.listeners.forEach(fn => {
                try {
                    fn(state);
                } catch (e) {
                    console.error('[AlertSound] State listener error:', e);
                }
            });
        }
    }

    // Expose singleton instance to global scope
    window.WQMSAlertSound = new AlertSoundManager();

})(window);
