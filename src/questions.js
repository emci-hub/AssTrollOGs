/**
 * Core Static Questionnaire Dataset (Verbatim dynamic steps)
 */
export const PSYCH_QUESTIONS = [
  {
      key: "mbti",
      title: "Personality Type",
      type: "mbti",
      question: "Pick your personality type below — or build it step by step."
  },
  {
      key: "attachment",
      title: "How You Connect",
      type: "cards",
      question: "Which of these feels most like you when it comes to closeness?",
      choices: [
          {
              label: "Secure",
              desc: "You're comfortable being open and vulnerable with people you trust. (Example: You share how you're feeling and trust they'll listen with care.)",
              value: "secure"
          },
          {
              label: "Anxious",
              desc: "You care deeply and pick up on the smallest shifts in a relationship. (Example: You sometimes need a little extra reassurance that everything's okay.)",
              value: "anxious"
          },
          {
              label: "Avoidant",
              desc: "You value your independence and like having space to recharge on your own. (Example: You retreat to solo time when things start feeling tense.)",
              value: "avoidant"
          },
          {
              label: "Fearful-Avoidant",
              desc: "You want closeness, but part of you stays a little guarded. (Example: You want the connection, but pull back when it starts feeling too vulnerable.)",
              value: "fearful"
          }
      ]
  },
  {
      key: "conflict",
      title: "How You Handle Disagreements",
      type: "cards",
      question: "When things get tense, what do you usually do?",
      choices: [
          {
              label: "Collaborative",
              desc: "You like to talk it out until you find something that works for both of you. (Example: You lay out both sides and figure out a solution together.)",
              value: "collaborative"
          },
          {
              label: "Compromising",
              desc: "You look for a quick middle ground so things can keep moving. (Example: You settle on a fair compromise fast rather than dragging it out.)",
              value: "compromising"
          },
          {
              label: "Accommodating",
              desc: "You'd rather keep the peace than push your own preference. (Example: You go along with their plan to keep things smooth.)",
              value: "accommodating"
          },
          {
              label: "Avoiding",
              desc: "You need a little space to cool off before you can talk it through. (Example: You ask for a pause in a heated moment so you can come back calmer.)",
              value: "avoiding"
          }
      ]
  },
  {
      key: "loveLanguage",
      title: "How You Feel Loved",
      type: "cards",
      question: "What makes you feel most loved and supported?",
      choices: [
          {
              label: "Words of Affirmation",
              desc: "Hearing it — specifically and sincerely. (Example: A genuine text telling you exactly why they appreciate you.)",
              value: "words"
          },
          {
              label: "Quality Time",
              desc: "Getting someone's full, undistracted attention. (Example: An evening walk together with phones left behind.)",
              value: "time"
          },
          {
              label: "Acts of Service",
              desc: "Someone quietly making your day a little easier. (Example: They take a chore off your plate when your week's already packed.)",
              value: "service"
          },
          {
              label: "Physical Touch",
              desc: "Physical closeness — a hand to hold, someone sitting near you. (Example: Sitting close on the couch, or holding hands in a crowd.)",
              value: "touch"
          },
          {
              label: "Receiving Gifts",
              desc: "Being thought of — the gift matters less than the fact they remembered. (Example: A small thing that reminds them of an inside joke you share.)",
              value: "gifts"
          }
      ]
  },
  {
      key: "expression",
      title: "How You Speak Up",
      type: "cards",
      question: "When you need something, how do you usually say so?",
      choices: [
          {
              label: "Direct",
              desc: "You just say it, plainly, as it comes up. (Example: 'I need 20 minutes of quiet to wind down.')",
              value: "direct"
          },
          {
              label: "Indirect",
              desc: "You drop hints and hope they pick up on it. (Example: Mentioning you're tired, hoping plans quietly change.)",
              value: "indirect"
          },
          {
              label: "Reflective",
              desc: "You like to sit with it and figure out what you actually mean before you say it. (Example: Sleeping on it and writing your thoughts down before a big conversation.)",
              value: "reflective"
          },
          {
              label: "Analytical",
              desc: "You turn feelings into something concrete and workable. (Example: Laying out exactly what's going on as a clear list of what needs to happen.)",
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
