/**
 * Core Static Questionnaire Dataset (Verbatim dynamic steps)
 */
export const PSYCH_QUESTIONS = [
  {
      key: "mbti",
      title: "Personality Archetype (MBTI)",
      type: "mbti",
      question: "Select or build the exact MBTI matrix configuration."
  },
  {
      key: "attachment",
      title: "Attachment Profile",
      type: "cards",
      question: "Choose the style reflecting comfort levels with emotional vulnerability and intimacy proximity:",
      choices: [
          {
              label: "Secure",
              desc: "Comfortable with emotional intimacy, natural vulnerability, and direct sharing of inner states. (Example: Expressing feelings openly and trusting that your partner will listen with care.)",
              value: "secure"
          },
          {
              label: "Anxious",
              desc: "Attuned and deeply caring, with high sensitivity to relationship security and connection transitions. (Example: Seeking constant reassurances to ease persistent doubts about relationship stability.)",
              value: "anxious"
          },
          {
              label: "Avoidant",
              desc: "Self-reliant, calm, and prioritizing personal independence while working to preserve safe spaces. (Example: Retreating to absolute solo activities to decompress when relationship friction rises.)",
              value: "avoidant"
          },
          {
              label: "Fearful-Avoidant",
              desc: "Deeply reflective, balancing a strong desire for close intimacy with a structural self-protective reserve. (Example: Wanting connection but pulling back when a dynamic starts feeling too vulnerable.)",
              value: "fearful"
          }
      ]
  },
  {
      key: "conflict",
      title: "Conflict Resolution Style",
      type: "cards",
      question: "Select the primary resolution model deployed when relationship stress or tension increases:",
      choices: [
          {
              label: "Collaborative",
              desc: "Active problem-solvers who integrate perspectives to establish win-win pathways. (Example: Laying out all dynamic viewpoints on the table to design a structural compromise together.)",
              value: "collaborative"
          },
          {
              label: "Compromising",
              desc: "Pragmatic balance-seekers who look for rapid common ground to preserve progress momentum. (Example: Agreeing on a quick middle ground to keep things moving forward with minimal emotional friction.)",
              value: "compromising"
          },
          {
              label: "Accommodating",
              desc: "Harmony-prioritizers who actively defer preferences to preserve mutual connection levels. (Example: Agreeing with your partner's plans to maintain smooth domestic peace and ease tension.)",
              value: "accommodating"
          },
          {
              label: "Avoiding",
              desc: "Space-respecters who utilize intentional downtime to analyze variables coolly before speaking. (Example: Asking for a temporary pause in a heated discussion to cool down before reconnecting.)",
              value: "avoiding"
          }
      ]
  },
  {
      key: "loveLanguage",
      title: "Primary Love Language",
      type: "cards",
      question: "Select the primary energetic channel used to express and receive relationship support:",
      choices: [
          {
              label: "Words of Affirmation",
              desc: "Feeling deeply valued and secure through focused verbal kindness and appreciative statements. (Example: Receiving a genuine text detailing exactly why your efforts are appreciated.)",
              value: "words"
          },
          {
              label: "Quality Time",
              desc: "Thriving on focused, shared attention and completely uninterrupted personal connection. (Example: Planning a regular evening walk together with all devices placed on absolute silent mode.)",
              value: "time"
          },
          {
              label: "Acts of Service",
              desc: "Quiet support executed through helpful, tangible daily actions that simplify life operations. (Example: Taking over a complex domestic chore when your partner is navigating a tight work schedule.)",
              value: "service"
          },
          {
              label: "Physical Touch",
              desc: "Tactile safety and grounding connection through consistent warmth, proximity, or small touchpoints. (Example: Sitting close together on the couch or holding hands while walking through crowds.)",
              value: "touch"
          },
          {
              label: "Receiving Gifts",
              desc: "Feeling deeply seen, valued, and thought of through symbolic, reflective tokens of connection. (Example: Receiving a small item that reminds your partner of a shared inside reference.)",
              value: "gifts"
          }
      ]
  },
  {
      key: "expression",
      title: "Immediate Expression Style",
      type: "cards",
      question: "Select the style used to communicate immediate tactical goals or emotional needs:",
      choices: [
          {
              label: "Direct",
              desc: "Clear, linear verbalization of internal states and structural needs exactly as they arise. (Example: Saying 'I need 20 minutes of uninterrupted quiet space right now to wind down.')",
              value: "direct"
          },
          {
              label: "Indirect",
              desc: "Soft verbal cues, subtle gestures, and situational setup to preserve social harmony. (Example: Dropping gentle conversational hints about feeling tired in hopes of changing plans.)",
              value: "indirect"
          },
          {
              label: "Reflective",
              desc: "Processing variables offline and analyzing dynamics before delivering a structured outline. (Example: Taking a night to write down thoughts clearly before having a key conversation.)",
              value: "reflective"
          },
          {
              label: "Analytical",
              desc: "Converting emotional variables into objective facts and logical problem statements. (Example: Presenting a structured bullet list of specific tasks and scheduling challenges.)",
              value: "analytical"
          }
      ]
  }
];

// Complete array of Myers-Briggs Classifications
export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ"
];
