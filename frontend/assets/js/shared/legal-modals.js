/**
 * WQMS Legal Modals (Privacy Policy & Terms of Service)
 * Our Lady of Fatima University - Antipolo Campus
 */

(function() {
    // Inject CSS for Legal Modals
    const styleId = 'wqms-legal-modal-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .legal-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.25s ease, visibility 0.25s ease;
            }
            .legal-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .legal-modal-container {
                background: #ffffff;
                width: 100%;
                max-width: 720px;
                max-height: 85vh;
                border-radius: 16px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: scale(0.95) translateY(10px);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .legal-modal-overlay.active .legal-modal-container {
                transform: scale(1) translateY(0);
            }
            .legal-modal-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .legal-modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #ffffff;
            }
            .legal-modal-close-btn {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: #ffffff;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .legal-modal-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            .legal-modal-body {
                padding: 24px;
                overflow-y: auto;
                font-size: 0.95rem;
                line-height: 1.6;
                color: #334155;
            }
            .legal-modal-body h4 {
                margin-top: 18px;
                margin-bottom: 8px;
                color: #0f172a;
                font-size: 1.05rem;
                font-weight: 600;
            }
            .legal-modal-body p {
                margin-bottom: 12px;
            }
            .legal-modal-body ul {
                margin-bottom: 12px;
                padding-left: 20px;
            }
            .legal-modal-body li {
                margin-bottom: 6px;
            }
            .legal-badge {
                display: inline-block;
                padding: 6px 14px;
                background: #e0f2fe;
                color: #0369a1;
                border: 1px solid #bae6fd;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 800;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .legal-modal-footer {
                padding: 16px 24px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
            }
            .legal-modal-btn {
                padding: 10px 20px;
                background: #0284c7;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .legal-modal-btn:hover {
                background: #0369a1;
            }
            @media (max-width: 640px) {
                .legal-modal-overlay {
                    padding: 12px;
                }
                .legal-modal-container {
                    max-height: 92vh;
                    border-radius: 12px;
                }
                .legal-modal-header {
                    padding: 16px 18px;
                }
                .legal-modal-header h3 {
                    font-size: 1.1rem;
                }
                .legal-modal-close-btn {
                    width: 36px;
                    height: 36px;
                    font-size: 22px;
                }
                .legal-modal-body {
                    padding: 16px 18px;
                    font-size: 0.875rem;
                }
                .legal-modal-footer {
                    padding: 12px 18px;
                }
                .legal-modal-btn {
                    width: 100%;
                    padding: 12px;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Modal Content Templates
    const privacyPolicyHTML = `
        <div class="legal-badge">OLFU Antipolo Campus</div>
        <p style="margin-top: 10px; font-size: 0.85rem; color: #64748b;">Effective Date: September 2026</p>
        
        <h4>1. Overview</h4>
        <p>This Privacy Policy describes how the <strong>Water Quality Monitoring System (WQMS)</strong> collects, uses, and safeguards information. This system is operational exclusively at <strong>Our Lady of Fatima University (OLFU) - Antipolo Campus</strong> to monitor and maintain drinking water safety across campus hydration stations.</p>

        <h4>2. Data Collection & Authorized Roles</h4>
        <p>The WQMS platform collects operational metrics and administrative account data strictly for authorized campus personnel (Operators, Technicians, and Administrators):</p>
        <ul>
            <li><strong>Water Quality Telemetry:</strong> Automated ESP32 sensor metrics including pH levels, Total Dissolved Solids (TDS in ppm), Turbidity (NTU), and Temperature (°C).</li>
            <li><strong>Account & Access Credentials:</strong> Authorized operator profile names, OLFU institutional email addresses, role assignments (Administrator, Operator, Technician, Viewer), and authentication tokens.</li>
            <li><strong>System Audit Logs:</strong> Timestamped records of alert resolutions, system configurations, and maintenance actions performed by authorized campus personnel.</li>
        </ul>

        <h4>3. How We Use Information</h4>
        <p>Collected data is used strictly for:</p>
        <ul>
            <li>Real-time monitoring of campus drinking fountains to ensure compliance with drinking water health standards.</li>
            <li>Dispatching automated alerts to facility engineers and technicians when parameter thresholds indicate potential risks.</li>
            <li>Generating daily, weekly, and monthly water quality analytics for OLFU Antipolo campus administration.</li>
        </ul>

        <h4>4. Data Protection & Access Control</h4>
        <p>We maintain strict security measures to protect WQMS telemetry and user profiles against unauthorized access. Access to system controls is restricted to authorized campus staff. We do not share, sell, or disclose system telemetry or personal data to third parties.</p>

        <h4>5. Contact Us</h4>
        <p>For questions or concerns regarding WQMS data privacy at OLFU Antipolo Campus, contact the Facilities & Technology Administration at <code>capstone@fatima.edu.ph</code>.</p>
    `;

    const termsOfServiceHTML = `
        <div class="legal-badge">OLFU Antipolo Campus</div>
        <p style="margin-top: 10px; font-size: 0.85rem; color: #64748b;">Effective Date: September 2026</p>

        <h4>1. Acceptance of Terms</h4>
        <p>By accessing or utilizing the <strong>WQMS Web Portal</strong>, you agree to comply with these Terms of Service. This system is dedicated exclusively to the monitoring of drinking water quality at <strong>Our Lady of Fatima University - Antipolo Campus</strong>.</p>

        <h4>2. Authorized System Usage</h4>
        <p>Access to the WQMS dashboard, telemetry reports, sensor configuration, and administrative settings is strictly restricted to authorized university personnel:</p>
        <ul>
            <li><strong>Operators & Technicians:</strong> Responsible for real-time monitoring, prompt response to automated parameter alerts, hardware calibration, and logging physical maintenance.</li>
            <li><strong>Administrators:</strong> Authorized to manage system hardware registries, user roles, security policies, and operational thresholds.</li>
        </ul>
        <p style="font-size: 0.875rem; color: #64748b; margin-top: 6px;"><em>Note: The portal is dedicated exclusively for authorized maintenance and administrative staff, and is not intended for public or general student access.</em></p>

        <h4>3. System Integrity & Prohibited Actions</h4>
        <p>Users are strictly prohibited from:</p>
        <ul>
            <li>Attempting to tamper with ESP32 sensor nodes, hardware microcontrollers, or campus network telemetry payloads.</li>
            <li>Bypassing role-based access control (RBAC) mechanisms or attempting unauthorized administrative actions.</li>
            <li>Submitting false alert resolutions or falsifying maintenance records.</li>
        </ul>

        <h4>4. Operational Disclaimers</h4>
        <p>The WQMS status indicators (Safe, Warning, Critical/Offline) serve as automated health monitoring guidance. In the event of physical water discoloration, unusual odor, or an explicit Offline warning badge, campus users must refrain from using the affected fountain node immediately.</p>

        <h4>5. Governing Scope</h4>
        <p>These terms apply strictly within the <strong>OLFU Antipolo Campus</strong> jurisdiction. Intellectual property rights for the WQMS software, hardware schemas, and web dashboards belong to Our Lady of Fatima University.</p>
    `;

    // Function to ensure Modal DOM element exists
    function getOrCreateModalContainer() {
        let overlay = document.getElementById('wqmsLegalModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'wqmsLegalModalOverlay';
            overlay.className = 'legal-modal-overlay';
            overlay.innerHTML = `
                <div class="legal-modal-container">
                    <div class="legal-modal-header">
                        <h3 id="wqmsLegalModalTitle">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            <span id="wqmsLegalModalTitleText">Legal Information</span>
                        </h3>
                        <button type="button" class="legal-modal-close-btn" id="wqmsLegalModalCloseBtnHeader">&times;</button>
                    </div>
                    <div class="legal-modal-body" id="wqmsLegalModalBody"></div>
                    <div class="legal-modal-footer">
                        <button type="button" class="legal-modal-btn" id="wqmsLegalModalCloseBtnFooter">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            document.getElementById('wqmsLegalModalCloseBtnHeader')?.addEventListener('click', function() {
                window.closeLegalModal();
            });
            document.getElementById('wqmsLegalModalCloseBtnFooter')?.addEventListener('click', function() {
                window.closeLegalModal();
            });

            // Close on overlay click
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    window.closeLegalModal();
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    window.closeLegalModal();
                }
            });
        }
        return overlay;
    }

    // Event delegation for legal modal triggers
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (!target) return;

        if (target.id === 'footerPrivacyLink' || target.id === 'openPrivacyPolicyLink') {
            e.preventDefault();
            window.openPrivacyPolicyModal();
        } else if (target.id === 'footerTermsLink' || target.id === 'openTermsLink') {
            e.preventDefault();
            window.openTermsModal();
        }
    });

    // Expose global methods
    window.openPrivacyPolicyModal = function() {
        const overlay = getOrCreateModalContainer();
        document.getElementById('wqmsLegalModalTitleText').textContent = 'Privacy Policy';
        document.getElementById('wqmsLegalModalBody').innerHTML = privacyPolicyHTML;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.openTermsModal = function() {
        const overlay = getOrCreateModalContainer();
        document.getElementById('wqmsLegalModalTitleText').textContent = 'Terms of Service';
        document.getElementById('wqmsLegalModalBody').innerHTML = termsOfServiceHTML;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeLegalModal = function() {
        const overlay = document.getElementById('wqmsLegalModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    };
})();
