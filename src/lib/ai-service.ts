const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function hasOpenRouterConfig() {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL);
}

function buildFallbackCoachAnswer(
  question: string,
  userData: {
    completionRate: number;
    totalStudyMinutes: number;
    avgFocusScore: number;
    subjectStats: Record<string, { total: number; completed: number }>;
    targetRole?: string;
    careerGoal?: string;
  }
) {
  const normalized = question.trim().toLowerCase();
  const activeSubjects = Object.keys(userData.subjectStats);
  const studyHours = Math.round((userData.totalStudyMinutes / 60) * 10) / 10;

  if (/^(hi|hey|hello|yo)\b/.test(normalized)) {
    return `Hey, how can I help you today? I can help with focus, planning, revision strategy, or turning your current study data into next steps. Right now I can see ${studyHours} study hour${studyHours === 1 ? '' : 's'} tracked and ${activeSubjects.length} active subject${activeSubjects.length === 1 ? '' : 's'}.`;
  }

  if (/(focus|concentrat)/.test(normalized)) {
    return `Your current focus score is about ${userData.avgFocusScore}%. A good next move is to study in shorter blocks, start with the hardest topic first, and keep one clear target for each session. If you want, I can also help you build a focus routine around your current subjects.`;
  }

  if (/(study plan|schedule|planner)/.test(normalized)) {
    return 'I can help you build a study plan right now. Tell me your subjects, exam date, how many hours you can study per day, and what time you want to start, and I will structure it clearly.';
  }

  if (/(prioriti|subject|what should i study)/.test(normalized)) {
    if (activeSubjects.length > 0) {
      return `Based on your tracked work, your current subjects include ${activeSubjects.join(', ')}. A strong default is to prioritize the hardest subject first, then the one with the nearest deadline, then revision. If you want, I can rank them with you.`;
    }

    return 'A strong default is to prioritize the hardest subject first, then the one with the nearest deadline, then revision. If you tell me your subjects and exam dates, I can rank them properly.';
  }

  if (/(weak|improve|better)/.test(normalized)) {
    return `A practical way to improve is to look at unfinished work, repeated mistakes, and the subjects where you spend the most time with the least progress. Your tracked completion rate is ${userData.completionRate}%, so we can use that as a baseline and improve from there.`;
  }

  return `I can still help even though the live AI provider is unavailable right now. Based on your current records, you have ${studyHours} study hour${studyHours === 1 ? '' : 's'} tracked, a focus score around ${userData.avgFocusScore}%, and ${activeSubjects.length} active subject${activeSubjects.length === 1 ? '' : 's'}. Your current target role is ${userData.targetRole || 'not set'}. Ask me about planning, focus, revision, or prioritization and I’ll guide you from that.`;
}

function extractCoachAnswer(responseText: string): string {
  const trimmed = responseText.trim();
  const jsonText = trimmed.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();

  try {
    const parsed = JSON.parse(jsonText) as {
      advice?: unknown;
      answer?: unknown;
      message?: unknown;
      content?: unknown;
    };

    for (const key of ['advice', 'answer', 'message', 'content'] as const) {
      if (typeof parsed[key] === 'string' && parsed[key].trim()) {
        return parsed[key].trim();
      }
    }
  } catch {
    // The provider returned normal text, so use it as-is.
  }

  return trimmed;
}

// Generate AI response for study coach
export async function generateAIResponse(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (!hasOpenRouterConfig()) {
    throw new Error('OpenRouter is not configured');
  }

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}`);
    }

    const completion = await response.json();
    const content = completion.choices[0]?.message?.content;
    return content || '';
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Generate AI insights for the student
export async function generateAIInsights(userData: {
  completionRate: number;
  totalStudyMinutes: number;
  avgFocusScore: number;
  subjectStats: Record<string, { total: number; completed: number }>;
  skills: Array<{ name: string; level: number; progress: number }>;
  targetRole?: string;
  careerGoal?: string;
  upcomingDeadlines?: Array<{ title: string; subject: string | null; dueDate: string }>;
  question?: string;
}): Promise<{
  insights: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
  }>;
  learningStyle: {
    Visual: number;
    'Reading/Writing': number;
    Auditory: number;
    Kinesthetic: number;
  };
  studyTip: string;
  answer?: string;
}> {
  const systemPrompt = userData.question
    ? `You are a warm, practical study coach. Answer the student's question directly in natural language. Do not return JSON, object syntax, field names such as "advice", or code fences. Keep the response concise, specific, and encouraging. Use short paragraphs or a small numbered list only when it genuinely improves clarity.`
    : `You are an expert learning coach AI that provides personalized insights for students. You analyze student data and provide actionable advice. Always respond with valid JSON in the exact format requested. Be specific and practical in your recommendations.`;

  const prompt = userData.question 
    ? `The student is asking: "${userData.question}"
    
Student Context:
- Task Completion Rate: ${userData.completionRate}%
- Total Study Hours: ${Math.round(userData.totalStudyMinutes / 60)}
- Average Focus Score: ${userData.avgFocusScore}%
- Active Subjects: ${Object.keys(userData.subjectStats).length}
- Target Role: ${userData.targetRole || 'Not set'}
- Career Goal: ${userData.careerGoal || 'Not set'}
- Upcoming Deadlines: ${userData.upcomingDeadlines?.map((deadline) => `${deadline.title}${deadline.subject ? ` (${deadline.subject})` : ''} due ${deadline.dueDate}`).join('; ') || 'None'}

Please provide a helpful, encouraging response as their study coach. If they're asking for advice, give specific actionable recommendations based on their data. Return only the response text, not JSON.`
    : `Analyze the following student data and provide personalized learning insights:

Student Statistics:
- Task Completion Rate: ${userData.completionRate}%
- Total Study Hours: ${Math.round(userData.totalStudyMinutes / 60)}
- Average Focus Score: ${userData.avgFocusScore}%
- Active Subjects: ${Object.keys(userData.subjectStats).length}

Subject Performance:
${Object.entries(userData.subjectStats)
  .map(([subject, stats]) => `- ${subject}: ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion (${stats.completed}/${stats.total} tasks)`)
  .join('\n') || 'No subject data available'}

Skills Progress:
${userData.skills.map(s => `- ${s.name}: Level ${s.level}, Progress ${s.progress}%`).join('\n') || 'No skills tracked yet'}

Career Context:
- Target role: ${userData.targetRole || 'Not set'}
- Career goal: ${userData.careerGoal || 'Not set'}

Provide your response as valid JSON in exactly this format:
{
  "insights": [
    {
      "type": "strength" | "improvement" | "recommendation" | "alert",
      "title": "Short descriptive title",
      "description": "Detailed description with specific actionable advice",
      "action": "Specific action the student should take"
    }
  ],
  "learningStyle": {
    "Visual": <number 0-100>,
    "Reading/Writing": <number 0-100>,
    "Auditory": <number 0-100>,
    "Kinesthetic": <number 0-100>
  },
  "studyTip": "A personalized study tip based on the analysis"
}

Provide exactly 4-6 insights. Make sure the learningStyle percentages add up to 100.`;

  try {
    const responseText = await generateAIResponse(prompt, systemPrompt);
    
    // If it was a question, return the answer directly
    if (userData.question) {
      return {
        insights: [
          {
            type: 'recommendation',
            title: 'AI Coach Response',
            description: extractCoachAnswer(responseText),
            action: 'Apply these insights to your study routine',
          },
        ],
        learningStyle: {
          Visual: 40,
          'Reading/Writing': 25,
          Auditory: 20,
          Kinesthetic: 15,
        },
        studyTip: 'Start with the most challenging subjects when your energy is highest.',
        answer: extractCoachAnswer(responseText),
      };
    }
    
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        insights: parsed.insights || [],
        learningStyle: parsed.learningStyle || {
          Visual: 40,
          'Reading/Writing': 25,
          Auditory: 20,
          Kinesthetic: 15,
        },
        studyTip: parsed.studyTip || 'Take regular breaks to improve retention.',
      };
    }
    
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.error('Error parsing AI insights:', error);
    
    // Return default insights on error
    return {
      insights: [
        {
          type: 'recommendation',
          title: `${userData.targetRole || 'Your'} learning snapshot`,
          description: `You have completed ${userData.completionRate}% of your tracked tasks, logged ${Math.round(userData.totalStudyMinutes / 60)} study hours, and averaged ${userData.avgFocusScore}% focus. Keep using these records to make your next plan more precise.`,
          action: userData.careerGoal ? `Use your study plan to move toward: ${userData.careerGoal}` : 'Set a career goal and generate a focused plan',
        },
        {
          type: 'strength',
          title: `${Object.keys(userData.subjectStats)[0] || 'Your priority subject'} deserves attention`,
          description: Object.entries(userData.subjectStats).length ? Object.entries(userData.subjectStats).map(([subject, stats]) => `${subject}: ${stats.completed}/${stats.total} complete`).join(' · ') : 'Add your first subject to start building a personalized report.',
          action: 'Open the planner and schedule the next focused session',
        },
        {
          type: 'recommendation',
          title: 'Use the Pomodoro Timer',
          description: 'Break your study sessions into focused 25-minute blocks with short breaks for better retention.',
          action: 'Try the Pomodoro timer in the Productivity section',
        },
      ],
      learningStyle: {
        Visual: 40,
        'Reading/Writing': 25,
        Auditory: 20,
        Kinesthetic: 15,
      },
      studyTip: 'Start with the most challenging subjects when your energy is highest.',
      answer: userData.question ? buildFallbackCoachAnswer(userData.question, userData) : undefined,
    };
  }
}

export interface CareerRoadmapItem {
  title: string;
  subject: string;
  focus: string;
  minutes: number;
  dayOffset: number;
}

export interface CareerTargetAnalysis {
  skills: Array<{ name: string; category: string; targetLevel: number }>;
  gaps: string[];
}

export async function analyzeCareerTarget(targetRole: string, currentSkills: Array<{ name: string; progress: number }>): Promise<CareerTargetAnalysis> {
  const normalized = targetRole.toLowerCase();
  const fallback = normalized.includes('aiml') || normalized.includes('ai/ml') || normalized.includes('machine learning')
    ? {
        skills: [
          { name: 'Python', category: 'AI/ML', targetLevel: 85 },
          { name: 'Statistics', category: 'AI/ML', targetLevel: 75 },
          { name: 'Machine Learning', category: 'AI/ML', targetLevel: 80 },
          { name: 'Deep Learning', category: 'AI/ML', targetLevel: 70 },
          { name: 'SQL', category: 'Data', targetLevel: 70 },
          { name: 'MLOps', category: 'Engineering', targetLevel: 65 },
        ],
        gaps: ['Python for data', 'Statistics and probability', 'Model evaluation', 'Deep learning', 'MLOps and deployment'],
      }
    : normalized.includes('frontend') || normalized.includes('react')
      ? {
          skills: [
            { name: 'JavaScript', category: 'Frontend', targetLevel: 85 },
            { name: 'React', category: 'Frontend', targetLevel: 85 },
            { name: 'TypeScript', category: 'Frontend', targetLevel: 80 },
            { name: 'Testing', category: 'Frontend', targetLevel: 75 },
            { name: 'Accessibility', category: 'Frontend', targetLevel: 70 },
          ],
          gaps: ['TypeScript', 'Component testing', 'Accessibility', 'Performance optimization'],
        }
      : {
          skills: [
            { name: 'JavaScript', category: 'Frontend', targetLevel: 85 },
            { name: 'React', category: 'Frontend', targetLevel: 80 },
            { name: 'Node.js', category: 'Backend', targetLevel: 80 },
            { name: 'REST APIs', category: 'Backend', targetLevel: 75 },
            { name: 'Testing', category: 'Engineering', targetLevel: 75 },
            { name: 'System Design', category: 'Engineering', targetLevel: 70 },
          ],
          gaps: ['REST APIs', 'Authentication', 'Testing', 'System Design'],
        };

  if (!hasOpenRouterConfig()) return fallback;

  try {
    const responseText = await generateAIResponse(`Analyze the target role "${targetRole}" for a learner with these current skills: ${currentSkills.map((skill) => `${skill.name} ${skill.progress}%`).join(', ') || 'no tracked skills'}.
Return only JSON in this format: {"skills":[{"name":"...","category":"...","targetLevel":80}],"gaps":["..."]}.
Include 5 to 8 essential skills and 4 to 6 specific skill gaps. targetLevel must be a realistic proficiency percentage for the role.`, 'You are a technical career skills analyst. Be specific to the role and practical for a learner.');
    const parsed = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || '{}');
    if (!Array.isArray(parsed.skills) || !Array.isArray(parsed.gaps) || !parsed.skills.length) return fallback;
    return {
      skills: parsed.skills.slice(0, 10).map((skill: Partial<CareerTargetAnalysis['skills'][number]>) => ({ name: skill.name || 'Role skill', category: skill.category || 'Career', targetLevel: Math.max(1, Math.min(100, Number(skill.targetLevel) || 70)) })),
      gaps: parsed.gaps.slice(0, 8).map(String),
    };
  } catch (error) {
    console.warn('Career target AI unavailable; using role template:', error instanceof Error ? error.message : error);
    return fallback;
  }
}

export async function generateCareerRoadmap(params: {
  targetRole: string;
  careerGoal: string;
  skills: Array<{ name: string; progress: number }>;
  timeframeDays?: number;
}): Promise<CareerRoadmapItem[]> {
  const fallback: CareerRoadmapItem[] = [
    { title: `Build a ${params.targetRole} portfolio project`, subject: 'Portfolio Project', focus: params.careerGoal, minutes: 90, dayOffset: 1 },
    { title: 'Close the most important skill gap', subject: 'Skill Development', focus: `Practice ${params.skills.find((skill) => skill.progress < 60)?.name || 'core role skills'} with a guided project`, minutes: 60, dayOffset: 3 },
    { title: 'Add tests and deployment documentation', subject: 'Engineering Practice', focus: 'Make the project production-ready and explain your decisions', minutes: 75, dayOffset: 5 },
  ];

  if (!hasOpenRouterConfig()) return fallback;

  try {
    const responseText = await generateAIResponse(`Create a practical learning roadmap for a student targeting ${params.targetRole}.
Career goal: ${params.careerGoal}
Current skills: ${params.skills.map((skill) => `${skill.name} ${skill.progress}%`).join(', ') || 'None'}
Available timeframe: ${params.timeframeDays || 30} days

Return only valid JSON in this format:
{"roadmap":[{"title":"...","subject":"...","focus":"...","minutes":60,"dayOffset":1}]}
Create 4 to 6 concrete steps, with dayOffset values increasing from today.`, 'You are a career coach. Make the roadmap specific, realistic, and project-based.');
    const parsed = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const items = Array.isArray(parsed.roadmap) ? parsed.roadmap : [];
    if (items.length === 0) return fallback;
    return items.slice(0, 6).map((item: Partial<CareerRoadmapItem>, index: number) => ({
      title: item.title || `Roadmap step ${index + 1}`,
      subject: item.subject || 'Career Development',
      focus: item.focus || `Work toward ${params.targetRole}`,
      minutes: Math.max(30, Math.min(180, Number(item.minutes) || 60)),
      dayOffset: Math.min(params.timeframeDays || 30, Math.max(index + 1, Number(item.dayOffset) || index + 1)),
    }));
  } catch (error) {
    console.warn('Career AI unavailable; using deterministic roadmap:', error instanceof Error ? error.message : error);
    return fallback;
  }
}

// Generate study schedule
export async function generateStudySchedule(params: {
  subjects: string[];
  examDates?: Array<{ subject: string; date: string }>;
  dailyStudyHours?: number;
  difficultyLevels?: Array<{ subject: string; level: string }>;
  priorities?: Array<{ subject: string; priority: string }>;
  preferredStartTime?: string;
}): Promise<{
  schedule: Array<{
    day: number;
    date: string;
    sessions: Array<{
      subject: string;
      startTime: string;
      endTime: string;
      focus: string;
    }>;
  }>;
  tips: string[];
}> {
  const systemPrompt = `You are an expert study planner AI. Create optimized study schedules that balance subjects based on priority, difficulty, and available time. Always respond with valid JSON. Never schedule a subject on or after its exam date.`;

  const preferredStartTime = params.preferredStartTime || '09:00';

  const prompt = `Create a study schedule based on:

Subjects: ${params.subjects.join(', ')}
Daily Study Hours Available: ${params.dailyStudyHours || 4}
Preferred First Session Start Time: ${preferredStartTime}
Exam Dates: ${params.examDates?.map(e => `${e.subject}: ${e.date}`).join(', ') || 'Not specified'}
Difficulty Levels: ${params.difficultyLevels?.map(d => `${d.subject}: ${d.level}`).join(', ') || 'All medium'}
Priority Levels: ${params.priorities?.map(p => `${p.subject}: ${p.priority}`).join(', ') || 'All medium'}

Today's date is: ${new Date().toISOString().split('T')[0]}

Generate a JSON schedule in this exact format:
{
  "schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "subject": "Subject Name",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "focus": "specific topic or activity"
        }
      ]
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}

Important:
- Distribute time proportionally based on priority and difficulty
- Include breaks between sessions
- Vary subjects throughout the day
- Higher priority subjects should get more time
- Start dates from today and stop at the exam date if one exists
- If an exam date exists, schedule sessions before the exam, not after it
- Use the preferred first session start time when reasonable
- Make sure the schedule is realistic and achievable`;

  try {
    const responseText = await generateAIResponse(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const sanitized = sanitizeGeneratedSchedule(parsed.schedule || [], params.examDates || []);
      return {
        schedule: sanitized,
        tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      };
    }
    
    throw new Error('No valid JSON found');
  } catch (error) {
    console.error('Error generating schedule:', error);
    
    // Generate a basic schedule as fallback
    const today = new Date();
    const examDateMap = new Map(
      (params.examDates || []).map((exam) => [exam.subject, new Date(exam.date)])
    );
    const latestExamDate = (params.examDates || [])
      .map((exam) => new Date(exam.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
      .at(-1);
    const fallbackDays = latestExamDate
      ? Math.max(
          1,
          Math.min(
            14,
            Math.ceil((latestExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          )
        )
      : 7;
    const schedule: Array<{
      day: number;
      date: string;
      sessions: Array<{
        subject: string;
        startTime: string;
        endTime: string;
        focus: string;
      }>;
    }> = [];
    
    for (let i = 0; i < fallbackDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const sessions: Array<{
        subject: string;
        startTime: string;
        endTime: string;
        focus: string;
      }> = [];
      let currentHour = parseInt(preferredStartTime.split(':')[0], 10) || 9;
      const currentMinute = parseInt(preferredStartTime.split(':')[1] || '0', 10) || 0;

      for (const subject of params.subjects.slice(0, Math.min(3, params.subjects.length))) {
        const subjectExamDate = examDateMap.get(subject);
        if (subjectExamDate && date >= subjectExamDate) {
          continue;
        }

        const startHour = String(currentHour).padStart(2, '0');
        const startMinute = String(currentMinute).padStart(2, '0');
        const endHour = String(currentHour + 1).padStart(2, '0');
        sessions.push({
          subject,
          startTime: `${startHour}:${startMinute}`,
          endTime: `${endHour}:${startMinute}`,
          focus: `Review and practice`,
        });
        currentHour += 2;
      }
      
      schedule.push({
        day: i + 1,
        date: date.toISOString().split('T')[0],
        sessions,
      });
    }
    
    return {
      schedule: sanitizeGeneratedSchedule(schedule, params.examDates || []),
      tips: [
        'Take 5-10 minute breaks between study sessions',
        'Review material before sleep for better retention',
        'Practice active recall instead of passive reading',
      ],
    };
  }
}

function sanitizeGeneratedSchedule(
  schedule: Array<{
    day: number;
    date: string;
    sessions: Array<{
      subject: string;
      startTime: string;
      endTime: string;
      focus: string;
    }>;
  }>,
  examDates: Array<{ subject: string; date: string }>
) {
  const examDateMap = new Map(
    examDates
      .filter((exam) => exam.subject && exam.date)
      .map((exam) => [exam.subject, new Date(exam.date)])
  );

  return schedule
    .map((day, index) => {
      const currentDate = new Date(day.date);
      const sessions = (day.sessions || []).filter((session) => {
        const examDate = examDateMap.get(session.subject);
        return !examDate || currentDate < examDate;
      });

      return {
        day: index + 1,
        date: day.date,
        sessions,
      };
    })
    .filter((day) => day.sessions.length > 0);
}
