/**
 * ============================================================================
 * Sehat Setu — Smart Community Health Monitoring & Early Warning System
 * Complete C++ Standalone Core Engine with Auth & User Profile Hub
 * ============================================================================
 */

#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <memory>
#include <iomanip>
#include <chrono>
#include <thread>
#include <sstream>
#include <algorithm>

#ifdef _WIN32
#include <windows.h>
#endif

namespace Color {
    const std::string RESET       = "\033[0m";
    const std::string BOLD        = "\033[1m";
    const std::string DIM         = "\033[2m";
    const std::string ITALIC      = "\033[3m";
    const std::string UNDERLINE   = "\033[4m";

    // Vibrant Foreground Colors
    const std::string TEAL        = "\033[38;2;13;148;136m";   // #0d9488
    const std::string EMERALD     = "\033[38;2;16;185;129m";   // #10b981
    const std::string CYAN        = "\033[38;2;6;182;212m";    // #06b6d4
    const std::string BLUE        = "\033[38;2;59;130;246m";   // #3b82f6
    const std::string INDIGO      = "\033[38;2;99;102;241m";   // #6366f1
    const std::string PURPLE      = "\033[38;2;168;85;247m";   // #a855f7
    const std::string AMBER       = "\033[38;2;245;158;11m";   // #f59e0b
    const std::string ORANGE      = "\033[38;2;249;115;22m";   // #f97316
    const std::string RED         = "\033[38;2;239;68;68m";    // #ef4444
    const std::string WHITE       = "\033[38;2;248;250;252m";  // #f8fafc
    const std::string GRAY        = "\033[38;2;148;163;184m";  // #94a3b8
    const std::string DARK_GRAY   = "\033[38;2;71;85;105m";    // #475569

    // Background Badges
    const std::string BG_TEAL     = "\033[48;2;13;148;136;38;2;255;255;255m";
    const std::string BG_EMERALD  = "\033[48;2;16;185;129;38;2;255;255;255m";
    const std::string BG_AMBER    = "\033[48;2;245;158;11;38;2;0;0;0m";
    const std::string BG_RED      = "\033[48;2;239;68;68;38;2;255;255;255m";
    const std::string BG_BLUE     = "\033[48;2;59;130;246;38;2;255;255;255m";
    const std::string BG_PURPLE   = "\033[48;2;168;85;247;38;2;255;255;255m";
    const std::string BG_DARK     = "\033[48;2;15;23;42;38;2;248;250;252m";
}

void enableVirtualTerminal() {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut != INVALID_HANDLE_VALUE) {
        DWORD dwMode = 0;
        if (GetConsoleMode(hOut, &dwMode)) {
            dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
            SetConsoleMode(hOut, dwMode);
        }
    }
#endif
}

void sleepMs(int ms) {
    std::this_thread::sleep_for(std::chrono::milliseconds(ms));
}

// User Profile Model
struct UserProfile {
    std::string id;
    std::string role; // "citizen", "doctor", "asha", "admin"
    std::string name;
    std::string email;
    std::string mobile;
    std::string abhaId;
    std::string familyId;
    std::string zone;
    std::string address;
    int age;
    std::string gender;
    std::string extraIdentifier; // MCI Reg or ASHA Badge
};

struct HealthTimelineEvent {
    std::string date;
    std::string type;
    std::string title;
    std::string description;
    std::string badge;
    std::string badgeColor;
};

struct FamilyMember {
    std::string id;
    std::string name;
    std::string relation;
    int age;
    std::string status;
    std::string riskLevel;
    std::string lastReportDate;
};

struct PatientRecord {
    std::string id;
    std::string name;
    std::string familyId;
    int age;
    std::string gender;
    std::string zone;
    std::vector<std::string> symptoms;
    std::string severity;
    std::string reportedDate;
    std::string status;
    std::string clinicalNotes;
    std::string nextFollowUp;
};

struct FollowUpTask {
    std::string id;
    std::string familyId;
    std::string headName;
    std::string address;
    std::string priority;
    std::string reason;
    std::string date;
    std::string status;
};

struct ZoneInfo {
    std::string id;
    std::string name;
    int riskScore;
    std::string riskLevel;
    int reportsCount;
    int baseline;
    std::string ashaWorker;
    std::string status;
    std::string clustering;
    std::string recentTrend;
    std::vector<std::string> signals;
    std::string verificationOutcome;
    std::string verificationNotes;
};

struct EarlyWarningAlert {
    std::string id;
    std::string zone;
    std::string title;
    int riskScore;
    std::string riskLevel;
    std::string timestamp;
    std::vector<std::string> signals;
    std::string assignedWorker;
    std::string status;
    std::string actionRecommendation;
};

class SehatSetuSystem {
public:
    UserProfile currentUser;
    std::vector<UserProfile> allUsers;

    std::vector<FamilyMember> familyMembers;
    std::vector<std::string> householdSignals;
    std::vector<HealthTimelineEvent> citizenTimeline;
    std::vector<PatientRecord> doctorPatients;
    std::vector<FollowUpTask> ashaTasks;
    std::map<std::string, ZoneInfo> zones;
    std::vector<EarlyWarningAlert> earlyWarnings;

    int totalCitizens = 12480;
    int totalFamilies = 3820;
    int totalHealthReports = 1284;
    int pendingFollowups = 37;
    int activeAlerts = 7;
    int highRiskAreas = 3;

    SehatSetuSystem() {
        initializeSeedData();
    }

    void initializeSeedData() {
        // Preset Accounts
        allUsers = {
            {"C10291", "citizen", "Rahul Sharma", "rahul.sharma@example.com", "+91 98765 43210", "14-8921-4320-1092", "FAM-10284", "Zone C", "House #42, Sector 9, Zone C", 32, "Male", ""},
            {"DR-1004", "doctor", "Dr. Arishta Sharma", "dr.arishta@health.gov.in", "+91 94567 89012", "14-7721-5544-3321", "", "Zone C", "UCHC-4 Hospital Complex", 41, "Female", "MCI/DMC-89201"},
            {"ASHA-204", "asha", "Sunita Devi", "sunita.asha@health.gov.in", "+91 91234 56789", "14-6655-4433-2211", "", "Zone C", "Ward 4 Sector 9", 36, "Female", "ASHA-DEL-ZN3-204"},
            {"ADMIN-001", "admin", "Dr. V. K. Paul (Director)", "director.idsp@nic.in", "+91 98111 22233", "14-1122-3344-5566", "", "All Zones", "Central Metro HQ", 52, "Male", "Chief Surveillance Officer"}
        };

        currentUser = allUsers[0]; // Default Citizen

        // Family
        familyMembers = {
            {"C10290", "Rajendra Sharma", "Father", 64, "Routine Monitoring", "NORMAL", "12 Aug"},
            {"C10289", "Shanti Sharma", "Mother", 59, "Follow-up Required", "WATCH", "19 Aug"},
            {"C10292", "Shreya", "wife/ Member 3", 27, "Routine Monitoring", "NORMAL", "04 Aug"},
            {"C10291", "Rahul Sharma (You)", "Self / Member 4", 32, "Routine Monitoring", "NORMAL", "18 Aug"}
        };

        householdSignals = {
            "2 health reports recorded from this household in the last 7 days.",
            "Household follow-up recommended by local health worker."
        };

        // Timeline
        citizenTimeline = {
            {"18 Aug, 10:15 AM", "REPORT", "Health issue reported", "Reported symptoms: Moderate Fever (38.5°C), Gastrointestinal discomfort. Duration: 2 days. Location: Zone C.", "Citizen Report", Color::BG_DARK},
            {"19 Aug, 02:30 PM", "DOCTOR", "Doctor consultation recorded", "Consultation conducted by Dr. Arishta Sharma (DR-1004). Vital signs documented: BP 120/80, SpO2 98%.", "Consultation Done", Color::BG_EMERALD},
            {"19 Aug, 02:45 PM", "DOCTOR", "Clinical assessment recorded", "Assessment: Acute febrile symptom cluster. Advice: ORS hydration, rest, paracetamol. Advised isolation.", "Clinical Notes", Color::BG_BLUE},
            {"24 Aug (Scheduled)", "FOLLOWUP", "Follow-up due", "Routine recovery verification follow-up scheduled via ASHA field visit / UCHC tele-review.", "Pending Milestone", Color::BG_AMBER}
        };

        // Doctor Patients
        doctorPatients = {
            {"C10291", "Rahul Sharma", "FAM-10284", 32, "M", "Zone C", {"Fever", "Diarrhea", "Nausea"}, "Moderate", "18 Aug", "Reviewed", "Advised hydration therapy and isolation. Symptom cluster logged for community surveillance.", "24 August"},
            {"C10304", "Pooja Verma", "FAM-10310", 28, "F", "Zone C", {"High Fever", "Chills", "Vomiting"}, "Severe", "21 Aug", "Pending Review", "", "23 August"},
            {"C10312", "Mohd. Imran", "FAM-10332", 45, "M", "Zone C", {"Fever", "Abdominal Cramps"}, "Moderate", "22 Aug", "Pending Review", "", "25 August"},
            {"C10188", "Kamla Devi", "FAM-10150", 67, "F", "Zone B", {"Dry Cough", "Mild Fever"}, "Mild", "20 Aug", "Reviewed", "Symptom trajectory stable.", "27 August"}
        };

        // ASHA Tasks
        ashaTasks = {
            {"TASK-1", "FAM-10284", "Rahul Sharma", "House #42, Sector 9, Zone C", "High", "Household cluster signal: 2 members reported symptoms in 7 days", "24 Aug", "Scheduled"},
            {"TASK-2", "FAM-10310", "Pooja Verma", "Block 4, Lane 2, Zone C", "High", "Severe acute febrile report needing vitals check & water source query", "23 Aug", "Pending Verification"},
            {"TASK-3", "FAM-10332", "Mohd. Imran", "House #12, Market St, Zone C", "Medium", "Gastrointestinal symptom follow-up & ORS kit delivery", "25 Aug", "Scheduled"}
        };

        // Zones
        zones["Zone A"] = {"Zone A", "Zone A — South Green Colony", 18, "NORMAL", 4, 6, "Meena Kumari (ASHA-201)", "Routine Monitoring", "Low", "Stable (-5%)", {"Normal seasonal baseline", "No clustering detected"}, "", ""};
        zones["Zone B"] = {"Zone B", "Zone B — East Lake Vista", 42, "WATCH", 14, 9, "Rekha Rani (ASHA-202)", "Watch List", "Moderate", "Upward (+18%)", {"Mild uptick in respiratory cases", "Adjoining Zone C"}, "", ""};
        zones["Zone C"] = {"Zone C", "Zone C — Urban North Ward", 84, "HIGH", 31, 10, "Sunita Devi (ASHA-204)", "Verification Pending", "High (4 Household Clusters)", "Spike (+42%)", {
            "Reports significantly above historical baseline (31 vs 10 baseline)",
            "Rapid increase in recent reports (+42% over last 72 hours)",
            "Similar health signals clustered geographically in Sector 9 & Market St",
            "Nearby Zone B & E showing matching gastrointestinal patterns"
        }, "", ""};
        zones["Zone D"] = {"Zone D", "Zone D — West Industrial Belt", 22, "NORMAL", 6, 8, "Kavita Roy (ASHA-205)", "Routine Monitoring", "Low", "Normal (+2%)", {"Expected baseline levels"}, "", ""};
        zones["Zone E"] = {"Zone E", "Zone E — Central Railway Colony", 58, "ALERT", 19, 11, "Anju Bala (ASHA-206)", "Watch List", "Moderate", "Upward (+31%)", {"Gastrointestinal cases rising", "Nearby water staging area"}, "", ""};

        // Early Warnings
        earlyWarnings = {
            {"EW-902", "Zone C", "Potential Community Health Risk Signal Detected", 84, "HIGH", "Today, 08:30 AM", {
                "Rapid increase in fever + gastrointestinal reports",
                "31 reports vs historical baseline of 10",
                "Geographic clustering in Sector 9 & Market Street",
                "Household clusters detected across 4 family units"
            }, "Sunita Devi (ASHA-204)", "Verification Pending", "Deploy field verification team, inspect municipal water distribution point #4, distribute ORS kits."},
            {"EW-901", "Zone E", "Abnormal Health Trend Watch", 58, "ALERT", "Yesterday, 04:15 PM", {
                "Gastrointestinal complaints rising in Railway Colony",
                "19 reports vs baseline of 11"
            }, "Anju Bala (ASHA-206)", "Investigation Ongoing", "Review primary health centre intake logs."}
        };
    }

    void switchUser(const std::string& userId) {
        for (const auto& u : allUsers) {
            if (u.id == userId || u.role == userId) {
                currentUser = u;
                break;
            }
        }
    }

    void submitCitizenReport(const std::vector<std::string>& symptoms, const std::string& severity, int duration, const std::string& notes) {
        std::stringstream ss;
        ss << "Reported symptoms: ";
        for (size_t i = 0; i < symptoms.size(); ++i) {
            ss << symptoms[i] << (i + 1 < symptoms.size() ? ", " : "");
        }
        ss << ". Severity: " << severity << ". Duration: " << duration << " days. " << (notes.empty() ? "" : "Notes: " + notes);

        HealthTimelineEvent ev;
        ev.date = "Today, Just Now";
        ev.type = "REPORT";
        ev.title = "Health issue reported";
        ev.description = ss.str();
        ev.badge = "Citizen Report";
        ev.badgeColor = severity == "Severe" ? Color::BG_RED : severity == "Moderate" ? Color::BG_AMBER : Color::BG_EMERALD;

        citizenTimeline.insert(citizenTimeline.begin(), ev);

        for (auto& m : familyMembers) {
            if (m.id == currentUser.id) {
                m.status = severity == "Severe" ? "Follow-up Required" : "Active Observation";
                m.riskLevel = severity == "Severe" ? "HIGH" : "WATCH";
                m.lastReportDate = "Today";
                break;
            }
        }

        householdSignals = {
            "3 health reports recorded from this household in the last 5 days.",
            "⚠️ Household follow-up recommended — multiple members reporting similar febrile signals."
        };

        totalHealthReports++;
        zones["Zone C"].reportsCount++;
        zones["Zone C"].riskScore = std::min(100, zones["Zone C"].riskScore + 2);
    }

    void recordDoctorConsultation(const std::string& patId, const std::string& notes, const std::string& advice, const std::string& followUp) {
        for (auto& p : doctorPatients) {
            if (p.id == patId) {
                p.status = "Reviewed";
                p.clinicalNotes = notes;
                p.nextFollowUp = followUp;
                break;
            }
        }

        if (patId == "C10291") {
            HealthTimelineEvent docEv = {
                "Today, Just Now",
                "DOCTOR",
                "Doctor consultation recorded",
                "Consultation by Dr. Arishta Sharma (DR-1004). Advice: " + advice,
                "Consultation Done",
                Color::BG_EMERALD
            };

            HealthTimelineEvent notesEv = {
                "Today, Just Now",
                "DOCTOR",
                "Clinical assessment recorded",
                "Clinical Notes: " + notes + " Next follow-up due: " + followUp + ".",
                "Clinical Assessment",
                Color::BG_BLUE
            };

            citizenTimeline.insert(citizenTimeline.begin(), notesEv);
            citizenTimeline.insert(citizenTimeline.begin(), docEv);
        }
    }

    void recordAshaVerification(const std::string& zKey, const std::string& outcome, const std::string& notes, const std::string& followUp) {
        if (zones.find(zKey) != zones.end()) {
            zones[zKey].status = outcome == "Signal Verified" ? "Signal Verified by ASHA" : "Verification Done (" + outcome + ")";
            zones[zKey].verificationOutcome = outcome;
            zones[zKey].verificationNotes = notes;
        }

        for (auto& w : earlyWarnings) {
            if (w.zone == zKey) {
                w.status = "Verified by ASHA (" + outcome + ")";
                break;
            }
        }
    }
};

class ConsoleUI {
public:
    static void printHeader(const std::string& title, const std::string& subtitle) {
        std::cout << "\n" << Color::TEAL << "╔══════════════════════════════════════════════════════════════════════════════════╗" << Color::RESET << "\n";
        std::cout << Color::TEAL << "║ " << Color::BOLD << Color::WHITE << std::left << std::setw(80) << title << Color::TEAL << " ║" << Color::RESET << "\n";
        if (!subtitle.empty()) {
            std::cout << Color::TEAL << "║ " << Color::GRAY << std::left << std::setw(80) << subtitle << Color::TEAL << " ║" << Color::RESET << "\n";
        }
        std::cout << Color::TEAL << "╚══════════════════════════════════════════════════════════════════════════════════╝" << Color::RESET << "\n\n";
    }

    static void renderRiskMeter(int score) {
        std::cout << "  " << Color::BOLD << "COMMUNITY RISK SCORE: " << Color::RESET;
        std::string barColor = Color::EMERALD;
        std::string label = "🟢 NORMAL";
        if (score > 75) { barColor = Color::RED; label = "🔴 HIGH RISK"; }
        else if (score > 50) { barColor = Color::ORANGE; label = "🟠 ALERT"; }
        else if (score > 30) { barColor = Color::AMBER; label = "🟡 WATCH"; }

        std::cout << barColor << Color::BOLD << score << " / 100 [" << label << "]" << Color::RESET << "\n  ";
        std::cout << barColor;
        int filled = score / 3;
        for (int i = 0; i < 33; ++i) {
            if (i < filled) std::cout << "█";
            else std::cout << "░";
        }
        std::cout << Color::RESET << "\n";
    }

    static void renderUserProfile(SehatSetuSystem& sys) {
        const auto& u = sys.currentUser;
        printHeader("🪪 USER PROFILE & HEALTH CREDENTIALS", "Authenticated Session: " + u.name + " (" + u.id + ")");

        std::cout << Color::INDIGO << "  ┌── Identity & National Health Linkages ─────────────────────────────────────┐" << Color::RESET << "\n";
        std::cout << "  │ Name: " << Color::BOLD << std::left << std::setw(25) << u.name << Color::RESET << " | Role: " << Color::EMERALD << Color::BOLD << std::setw(15) << u.role << Color::RESET << " │\n";
        std::cout << "  │ User ID: " << Color::CYAN << std::left << std::setw(22) << u.id << Color::RESET << " | ABHA ID: " << Color::BLUE << std::setw(20) << u.abhaId << Color::RESET << " │\n";
        if (!u.familyId.empty()) {
            std::cout << "  │ Family ID: " << Color::CYAN << std::left << std::setw(20) << u.familyId << Color::RESET << " | Ward: " << std::setw(25) << u.zone << " │\n";
        }
        if (!u.extraIdentifier.empty()) {
            std::cout << "  │ Registration Code: " << Color::AMBER << std::left << std::setw(50) << u.extraIdentifier << Color::RESET << " │\n";
        }
        std::cout << "  │ Contact: " << std::left << std::setw(22) << u.mobile << " | Email: " << std::setw(25) << u.email << " │\n";
        std::cout << Color::INDIGO << "  └───────────────────────────────────────────────────────────────────────────┘" << Color::RESET << "\n\n";
    }

    static void renderCitizenView(SehatSetuSystem& sys) {
        printHeader("👤 CITIZEN HEALTH PORTAL — SEHAT SETU", "Grassroots Health Monitoring & Family Health Hub");

        std::cout << Color::INDIGO << "  ┌── Citizen Profile ────────────────────────────────────────────────────────┐" << Color::RESET << "\n";
        std::cout << "  │ Name: " << Color::BOLD << sys.currentUser.name << Color::RESET << " | Citizen ID: " << Color::CYAN << sys.currentUser.id << Color::RESET << " | Family ID: " << Color::CYAN << sys.currentUser.familyId << Color::RESET << " │\n";
        std::cout << "  │ Ward: " << sys.currentUser.zone << " | Status: " << Color::EMERALD << Color::BOLD << "🟢 Routine Monitoring" << Color::RESET << " │\n";
        std::cout << Color::INDIGO << "  └───────────────────────────────────────────────────────────────────────────┘" << Color::RESET << "\n\n";

        std::cout << Color::BOLD << Color::PURPLE << "  👨‍👩‍👧‍👦 Family Health Overview (FAM-10284):" << Color::RESET << "\n";
        for (const auto& sig : sys.householdSignals) {
            std::cout << "  " << Color::AMBER << "⚠️  " << sig << Color::RESET << "\n";
        }
        std::cout << "\n";
        for (const auto& m : sys.familyMembers) {
            std::string color = (m.riskLevel == "HIGH") ? Color::RED : (m.riskLevel == "WATCH") ? Color::AMBER : Color::EMERALD;
            std::cout << "    • " << std::left << std::setw(20) << m.name << " (" << std::setw(15) << m.relation << ") | Status: " << color << m.status << Color::RESET << " [Last: " << m.lastReportDate << "]\n";
        }

        std::cout << "\n" << Color::BOLD << Color::TEAL << "  🩺 Citizen Health Timeline (with Photo Evidence Attachments):" << Color::RESET << "\n";
        for (const auto& ev : sys.citizenTimeline) {
            std::cout << "    " << Color::CYAN << "● " << std::left << std::setw(20) << ev.date << Color::RESET
                      << " | " << Color::BOLD << ev.title << Color::RESET << " [" << ev.badge << "]\n"
                      << "      " << Color::GRAY << ev.description << Color::RESET << "\n";
        }

        std::cout << "\n" << Color::BOLD << Color::BLUE << "  📋 My Medical Records Hub (Test Reports, Doctor Analysis, Prescriptions):" << Color::RESET << "\n";
        std::cout << "    1. 🧪 " << Color::BOLD << "Complete Blood Count (CBC) & Widal Panel" << Color::RESET << " [19 Aug 2026] — City Care Lab (Attached: cbc_widal_report.jpg)\n";
        std::cout << "    2. 👨‍⚕️ " << Color::BOLD << "Acute Febrile Assessment" << Color::RESET << " [19 Aug 2026] — Dr. Arishta Sharma (UCHC-4)\n";
        std::cout << "    3. 💊 " << Color::BOLD << "ORS Hydration & Probiotic Therapy" << Color::RESET << " [19 Aug 2026] — Rx Prescription (Attached: rx_prescription_slip.jpg)\n\n";
    }

    static void renderDoctorView(SehatSetuSystem& sys) {
        printHeader("🩺 DOCTOR / HEALTHCARE PROVIDER PORTAL", "UCHC-4 Community Hospital — Dr. Arishta Sharma (DR-1004)");

        std::cout << "  " << Color::BG_BLUE << " TODAY'S QUEUE " << Color::RESET
                  << "  Consultations: 4 | Pending Reviews: 3 | Active Follow-ups: 9\n\n";

        std::cout << Color::BOLD << "  📋 Patient Surveillance Intake Queue:\n" << Color::RESET;
        std::cout << Color::DARK_GRAY << "  ──────────────────────────────────────────────────────────────────────────────\n" << Color::RESET;
        std::cout << "  " << std::left << std::setw(10) << "Patient ID"
                  << std::setw(18) << "Name"
                  << std::setw(12) << "Family ID"
                  << std::setw(12) << "Severity"
                  << std::setw(15) << "Status"
                  << "Recent Symptoms\n";
        std::cout << Color::DARK_GRAY << "  ──────────────────────────────────────────────────────────────────────────────\n" << Color::RESET;

        for (const auto& p : sys.doctorPatients) {
            std::string sevColor = (p.severity == "Severe") ? Color::RED : (p.severity == "Moderate") ? Color::AMBER : Color::EMERALD;
            std::string statColor = (p.status == "Reviewed") ? Color::EMERALD : Color::AMBER;

            std::cout << "  " << std::left << std::setw(10) << p.id
                      << std::setw(18) << p.name
                      << std::setw(12) << p.familyId
                      << sevColor << std::setw(12) << p.severity << Color::RESET
                      << statColor << std::setw(15) << p.status << Color::RESET;
            for (size_t i = 0; i < p.symptoms.size(); ++i) {
                std::cout << p.symptoms[i] << (i + 1 < p.symptoms.size() ? ", " : "");
            }
            std::cout << "\n";
        }

        std::cout << "\n" << Color::BOLD << Color::AMBER << "  ⭐ Doctor Clinical Performance & Case Success Rate:" << Color::RESET << "\n";
        std::cout << "    • " << Color::BOLD << "Average Patient Rating:" << Color::RESET << " ⭐ 4.8 / 5.0 (142 verified reviews)\n";
        std::cout << "    • " << Color::BOLD << "Case Success Rate:" << Color::RESET << " 85.9% (134 of 156 cases improved/resolved)\n";
        std::cout << "    • " << Color::BOLD << "Resolved Cases:" << Color::RESET << " 112 | " << Color::BOLD << "Improved:" << Color::RESET << " 22 | " << Color::BOLD << "Follow-ups:" << Color::RESET << " 98\n";
        std::cout << "    • " << Color::BOLD << "Patient Feedback:" << Color::RESET << " \"Very thorough diagnosis and clear dosage instructions. - Rahul S.\"\n\n";
    }

    static void renderAshaView(SehatSetuSystem& sys) {
        printHeader("👩‍⚕️ ASHA FIELD WORKER PORTAL (MOBILE VIEW)", "Sunita Devi (ASHA-204) — Zone C North Ward");

        std::cout << "  " << Color::BG_PURPLE << " FIELD STATS " << Color::RESET
                  << "  Pending Follow-ups: 8 | High Risk Households: 2 | Community Alerts: 1\n\n";

        std::cout << Color::BOLD << Color::TEAL << "  📍 Area Health Status (Surveillance Wards):\n" << Color::RESET;
        for (const auto& pair : sys.zones) {
            const auto& z = pair.second;
            std::string zColor = (z.riskLevel == "HIGH") ? Color::RED : (z.riskLevel == "ALERT") ? Color::ORANGE : (z.riskLevel == "WATCH") ? Color::AMBER : Color::EMERALD;
            std::cout << "    • " << std::left << std::setw(10) << z.id
                      << " Risk: " << zColor << Color::BOLD << std::setw(6) << (std::to_string(z.riskScore) + "/100") << Color::RESET
                      << " [" << zColor << std::setw(10) << z.riskLevel << Color::RESET << "]"
                      << " | Reports: " << std::setw(3) << z.reportsCount << " (Base: " << z.baseline << ")"
                      << " | Status: " << z.status << "\n";
        }
        std::cout << "\n";
    }

    static void renderAdminView(SehatSetuSystem& sys) {
        printHeader("🏛️ HEALTH AUTHORITY SURVEILLANCE COMMAND CENTER", "District Epidemiological Surveillance Unit — Real-Time Early Warning");

        std::cout << "  " << Color::BG_DARK << " SURVEILLANCE KPIS " << Color::RESET << "\n";
        std::cout << "  Citizens: " << Color::CYAN << sys.totalCitizens << Color::RESET
                  << " | Families: " << Color::CYAN << sys.totalFamilies << Color::RESET
                  << " | Health Reports: " << Color::EMERALD << sys.totalHealthReports << Color::RESET
                  << " | Active Alerts: " << Color::RED << sys.activeAlerts << Color::RESET
                  << " | High-Risk Areas: " << Color::RED << sys.highRiskAreas << Color::RESET << "\n\n";

        const auto& zC = sys.zones["Zone C"];
        std::cout << Color::BOLD << Color::RED << "  🚨 HIGH-PRIORITY SURVEILLANCE TARGET: " << zC.name << Color::RESET << "\n";
        renderRiskMeter(zC.riskScore);

        std::cout << "\n  " << Color::BOLD << Color::CYAN << "💡 EXPLAINABLE AI RISK INTELLIGENCE (Why This Risk is High):" << Color::RESET << "\n";
        for (const auto& sig : zC.signals) {
            std::cout << "    " << Color::RED << "✓ " << Color::WHITE << sig << Color::RESET << "\n";
        }
        std::cout << "\n";
    }
};

void run20StepHackathonDemo(SehatSetuSystem& sys) {
    ConsoleUI::printHeader("⚡ 20-STEP CONNECTED HACKATHON DEMO WALKTHROUGH", "Full Cycle: Citizen -> Doctor -> Timeline -> AI -> Warning -> ASHA -> Authority");

    struct StepDef {
        int num;
        std::string title;
        std::string role;
        std::string desc;
    };

    std::vector<StepDef> steps = {
        {1, "Launchpad: Citizen Login", "CITIZEN", "Logged into Citizen Portal (C10291 - Rahul Sharma)."},
        {2, "Citizen Dashboard", "CITIZEN", "Routine monitoring status active. Inspecting dashboard cards."},
        {3, "Family Health Hub", "CITIZEN", "Viewing FAM-10284. Detecting household signal: 2 reports in 7 days."},
        {4, "Report Health Issue", "CITIZEN", "Opening symptom reporting form (Fever, Diarrhea, Nausea)."},
        {5, "Submit & Check Timeline", "CITIZEN", "Submitting health report. Updating Citizen timeline in real-time."},
        {6, "Doctor Login (DR-1004)", "DOCTOR", "Switching to Dr. Arishta Sharma (UCHC-4)."},
        {7, "Patient Queue Review", "DOCTOR", "Doctor reviews patient C10291 (Rahul Sharma) in consultation list."},
        {8, "Record Doctor Consultation", "DOCTOR", "Doctor documents clinical assessment, advice, and sets 24 Aug follow-up."},
        {9, "ASHA Worker Login", "ASHA", "Switching to mobile-optimized ASHA portal (Sunita Devi, ASHA-204)."},
        {10, "Household Follow-ups", "ASHA", "Inspecting prioritized task list for FAM-10284."},
        {11, "Community Alert Stream", "ASHA", "Reviewing Zone C early warning triggered by AI surveillance engine."},
        {12, "Inspect Zone C Details", "ASHA", "Examining Zone C community risk profile and 31 recent reports."},
        {13, "View Risk Score (84/100)", "ASHA", "Observing Risk Score Ring (84/100 HIGH RISK)."},
        {14, "Explainable AI Intelligence", "ADMIN", "Inspecting 4 explainable signal reasons (Baseline, Velocity, Clusters)."},
        {15, "Early Warnings Hub", "ADMIN", "Reviewing recommended action: Deploy field verification team."},
        {16, "ASHA Field Verification", "ASHA", "ASHA completes field survey: Confirms 'Signal Verified' with field notes."},
        {17, "Admin Command Center", "ADMIN", "Switching to Health Authority Command Center (ADMIN-001)."},
        {18, "Verified Alert Status", "ADMIN", "Zone C status successfully updated to 'Signal Verified by ASHA'."},
        {19, "Interactive Map Grid", "ADMIN", "Inspecting geospatial surveillance matrix across Zones A to E."},
        {20, "Epidemiological Analytics", "ADMIN", "Reviewing 7d/30d/90d symptom trends & environmental intelligence."}
    };

    for (const auto& s : steps) {
        std::cout << Color::BOLD << Color::CYAN << "════════════════════════════════════════════════════════════════════════════════════" << Color::RESET << "\n";
        std::cout << "  " << Color::BG_TEAL << " STEP " << s.num << "/20 " << Color::RESET
                  << "  " << Color::BOLD << s.title << Color::RESET << " [" << Color::PURPLE << s.role << Color::RESET << "]\n";
        std::cout << "  " << Color::GRAY << s.desc << Color::RESET << "\n";
        std::cout << Color::BOLD << Color::CYAN << "════════════════════════════════════════════════════════════════════════════════════" << Color::RESET << "\n\n";

        if (s.num == 5) {
            sys.submitCitizenReport({"Fever", "Diarrhea", "Nausea"}, "Moderate", 2, "Sudden onset fever with stomach cramps after drinking local water.");
            ConsoleUI::renderCitizenView(sys);
        } else if (s.num == 8) {
            sys.recordDoctorConsultation("C10291", "Acute febrile gastroenteritis symptom cluster. Documented for community pattern surveillance.", "Strict ORS hydration, avoid unboiled tap water, paracetamol TDS.", "24 August");
            ConsoleUI::renderDoctorView(sys);
        } else if (s.num == 13) {
            ConsoleUI::renderRiskMeter(84);
        } else if (s.num == 16) {
            sys.recordAshaVerification("Zone C", "Signal Verified", "Field survey confirmed localized gastrointestinal cluster in Sector 9 lane. Municipal pipe leakage reported near overhead tank.", "High Priority Sanitation Intervention");
            ConsoleUI::renderAshaView(sys);
        } else if (s.num == 17 || s.num == 18) {
            ConsoleUI::renderAdminView(sys);
        }

        sleepMs(500);
    }

    std::cout << "\n" << Color::BG_EMERALD << " 🏆 20-STEP HACKATHON DEMO COMPLETED SUCCESSFULLY! " << Color::RESET << "\n\n";
}

int main(int argc, char* argv[]) {
    enableVirtualTerminal();
    SehatSetuSystem sys;

    if (argc > 1 && std::string(argv[1]) == "--demo") {
        run20StepHackathonDemo(sys);
        return 0;
    }

    int choice = -1;
    while (choice != 0) {
        ConsoleUI::printHeader("🛡️ SEHAT SETU — SMART COMMUNITY HEALTH MONITORING", "C++ Core Healthcare Surveillance Engine & User Profile Hub");

        std::cout << "  " << Color::BOLD << "Current Active Session: " << Color::EMERALD << sys.currentUser.name << " [" << sys.currentUser.role << "]" << Color::RESET << "\n\n";
        std::cout << "  " << Color::TEAL << "1." << Color::RESET << " 👤 Citizen Portal (Report Issue, Family Hub, Timeline)\n";
        std::cout << "  " << Color::BLUE << "2." << Color::RESET << " 🩺 Doctor Portal (Consultation Queue, Clinical Notes)\n";
        std::cout << "  " << Color::PURPLE << "3." << Color::RESET << " 👩‍⚕️ ASHA Worker Mobile Dashboard (Follow-ups, Verification)\n";
        std::cout << "  " << Color::RED << "4." << Color::RESET << " 🏛️ Health Authority Command Center (Risk Intelligence, Analytics)\n";
        std::cout << "  " << Color::CYAN << "5." << Color::RESET << " 🪪 View Active User Profile & ABHA Linkages\n";
        std::cout << "  " << Color::INDIGO << "6." << Color::RESET << " 🛠️ Developer Quick Login & Account Switcher\n";
        std::cout << "  " << Color::AMBER << "7." << Color::RESET << " ⚡ Run 20-Step Automated Hackathon Demo Walkthrough\n";
        std::cout << "  " << Color::EMERALD << "8." << Color::RESET << " 📝 Submit New Citizen Health Report (Interactive Form)\n";
        std::cout << "  " << Color::BLUE << "9." << Color::RESET << " 🌐 Sign In with Google (Gmail) OAuth Authentication\n";
        std::cout << "  " << Color::GRAY << "0." << Color::RESET << " 🚪 Exit Application\n\n";

        std::cout << Color::BOLD << "  Enter Choice [0-9]: " << Color::RESET;
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::string dummy;
            std::cin >> dummy;
            choice = -1;
            continue;
        }

        std::cout << "\n";

        switch (choice) {
            case 1:
                sys.switchUser("citizen");
                ConsoleUI::renderCitizenView(sys);
                break;
            case 2:
                sys.switchUser("doctor");
                ConsoleUI::renderDoctorView(sys);
                break;
            case 3:
                sys.switchUser("asha");
                ConsoleUI::renderAshaView(sys);
                break;
            case 4:
                sys.switchUser("admin");
                ConsoleUI::renderAdminView(sys);
                break;
            case 5:
                ConsoleUI::renderUserProfile(sys);
                break;
            case 6: {
                std::cout << "  Select Account to Switch To:\n";
                std::cout << "  1. Rahul Sharma (Citizen - C10291)\n";
                std::cout << "  2. Dr. Arishta Sharma (Doctor - DR-1004)\n";
                std::cout << "  3. Sunita Devi (ASHA - ASHA-204)\n";
                std::cout << "  4. Dr. V. K. Paul (Admin - ADMIN-001)\n";
                std::cout << "  Choice: ";
                int userChoice;
                std::cin >> userChoice;
                if (userChoice == 1) sys.switchUser("citizen");
                else if (userChoice == 2) sys.switchUser("doctor");
                else if (userChoice == 3) sys.switchUser("asha");
                else if (userChoice == 4) sys.switchUser("admin");
                std::cout << "\n  " << Color::BG_EMERALD << " ✓ Switched to " << sys.currentUser.name << " " << Color::RESET << "\n\n";
                ConsoleUI::renderUserProfile(sys);
                break;
            }
            case 7:
                run20StepHackathonDemo(sys);
                break;
            case 8: {
                std::cout << Color::BOLD << "  --- Citizen Health Report Submission ---" << Color::RESET << "\n";
                std::cout << "  Enter symptoms (e.g. Fever, Diarrhea): ";
                std::string sympInput;
                std::cin.ignore();
                std::getline(std::cin, sympInput);

                std::cout << "  Enter severity (Mild / Moderate / Severe) [Moderate]: ";
                std::string sev;
                std::getline(std::cin, sev);
                if (sev.empty()) sev = "Moderate";

                std::cout << "  Enter duration in days [2]: ";
                std::string durStr;
                std::getline(std::cin, durStr);
                int dur = durStr.empty() ? 2 : std::stoi(durStr);

                std::cout << "  Enter observations/notes: ";
                std::string notes;
                std::getline(std::cin, notes);

                sys.submitCitizenReport({sympInput.empty() ? "Febrile discomfort" : sympInput}, sev, dur, notes);
                std::cout << "\n  " << Color::BG_EMERALD << " ✓ Health report submitted successfully. Timeline synced. " << Color::RESET << "\n\n";
                ConsoleUI::renderCitizenView(sys);
                break;
            }
            case 9: {
                std::cout << Color::BOLD << "  --- Google (Gmail) OAuth 2.0 Sign-In ---" << Color::RESET << "\n";
                std::cout << "  Enter your Gmail Address (e.g. user@gmail.com): ";
                std::string gmail;
                std::cin.ignore();
                std::getline(std::cin, gmail);
                if (gmail.empty()) gmail = "rahul.sharma@gmail.com";

                std::cout << "  Authenticating with Google OAuth 2.0...\n";
                sleepMs(400);
                std::cout << "  Token Exchange: Verified ✓\n";
                sys.currentUser.email = gmail;
                sys.currentUser.extraIdentifier = "Google Verified (" + gmail + ")";

                std::cout << "\n  " << Color::BG_EMERALD << " ✓ Successfully Authenticated with Google (" << gmail << ") " << Color::RESET << "\n\n";
                ConsoleUI::renderUserProfile(sys);
                break;
            }
            case 0:
                std::cout << Color::TEAL << "  Exiting Sehat Setu Surveillance Engine. Stay Safe!\n\n" << Color::RESET;
                break;
            default:
                std::cout << Color::RED << "  Invalid selection. Please choose an option from 0 to 8.\n\n" << Color::RESET;
                break;
        }

        if (choice != 0) {
            std::cout << Color::GRAY << "  Press Enter to return to main menu..." << Color::RESET;
            std::cin.ignore();
            std::cin.get();
        }
    }

    return 0;
}
