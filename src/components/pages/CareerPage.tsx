"use client";

import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, FileText, Lightbulb, Plus, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Skill { id?: string; name: string; level: number; progress: number; targetLevel?: number | null; category?: string | null; }
interface RecommendedSkill { name: string; category: string; targetLevel: number; progress: number; }
interface RoadmapItem { title: string; subject: string; focus: string; minutes: number; dayOffset: number; }

const defaultSkills: Skill[] = [
  { name: 'JavaScript', level: 70, progress: 70, category: 'Frontend' },
  { name: 'React', level: 60, progress: 60, category: 'Frontend' },
  { name: 'Node.js', level: 40, progress: 40, category: 'Backend' },
  { name: 'MongoDB', level: 50, progress: 50, category: 'Backend' },
];

const defaultGaps = ['REST APIs', 'Authentication', 'Testing', 'System Design'];

export function CareerPage() {
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [goal, setGoal] = useState('Build and ship a production-ready portfolio project');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [gaps, setGaps] = useState(defaultGaps);
  const [recommendedSkills, setRecommendedSkills] = useState<RecommendedSkill[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRoadmapDialog, setShowRoadmapDialog] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [timeframeDays, setTimeframeDays] = useState('30');
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeForm, setResumeForm] = useState({ fullName: '', phone: '', location: '', targetRole: 'Full Stack Developer', summary: '', experience: '', education: '', projects: '', skills: '' });

  const loadCareer = async () => {
    setIsLoading(true);
    try {
      const [careerResponse, skillsResponse] = await Promise.all([fetch('/api/career'), fetch('/api/skills')]);
      const careerData = await careerResponse.json();
      const skillsData = await skillsResponse.json();
      const savedRole = careerData.career?.targetRole || 'Full Stack Developer';
      if (careerData.success) {
        setTargetRole(savedRole);
        setGoal(careerData.career?.careerGoal || 'Build and ship a production-ready portfolio project');
      }
      if (skillsData.success) setSkills(skillsData.skills?.length ? skillsData.skills : defaultSkills);
      const resumeResponse = await fetch('/api/resume');
      const resumeData = await resumeResponse.json();
      if (resumeData.success && resumeData.profile) {
        const profile = resumeData.profile;
        setResumeForm((current) => ({ ...current, ...profile, experience: (profile.experience || []).join('\n'), education: (profile.education || []).join('\n'), projects: (profile.projects || []).join('\n'), skills: (profile.skills || []).join(', ') }));
        setResumeText(profile.resumeText || '');
      }

      // Hydrate role-specific skills and gaps whenever the Career OS opens.
      // This keeps the saved target role and the visible analysis in sync.
      const analysisResponse = await fetch('/api/career/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole: savedRole }) });
      const analysisData = await analysisResponse.json();
      if (analysisResponse.ok && analysisData.success) {
        setSkills(analysisData.skills || []);
        setRecommendedSkills(analysisData.recommendations || []);
        setGaps(analysisData.gaps || defaultGaps);
      }
    } catch {
      setSkills(defaultSkills);
      setMessage('Could not load saved career data.');
    } finally { setIsLoading(false); }
  };

  // Loading persisted career data is an external synchronization effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadCareer(); }, []);

  const saveCareer = async (values?: { targetRole?: string; careerGoal?: string }) => {
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/career', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole: values?.targetRole ?? targetRole, careerGoal: values?.careerGoal ?? goal }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save career profile');
      setMessage('Career profile saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save career profile'); }
    finally { setIsSaving(false); }
  };

  const generateRoadmapPreview = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/career', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole, careerGoal: goal, timeframeDays: Number(timeframeDays), commit: false }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to generate roadmap');
      setRoadmap(data.roadmap || []);
      setShowRoadmapDialog(false);
      setMessage('Roadmap preview ready. Review it before adding anything to Tasks or Calendar.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate roadmap'); }
    finally { setIsSaving(false); }
  };

  const addRoadmapToTasks = async () => {
    setIsRoadmapLoading(true);
    try {
      const response = await fetch('/api/career', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole, careerGoal: goal, timeframeDays: Number(timeframeDays), commit: true, roadmap }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add roadmap');
      setMessage(`${data.created} roadmap steps added to Tasks and Calendar.`);
      setRoadmap([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add roadmap'); }
    finally { setIsRoadmapLoading(false); }
  };

  const analyzeTargetRole = async () => {
    if (!targetRole.trim()) return;
    setIsAnalyzing(true);
    setMessage('');
    try {
      const response = await fetch('/api/career/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to analyze target role');
      setSkills(data.skills || []);
      setRecommendedSkills(data.recommendations || []);
      setGaps(data.gaps || defaultGaps);
      setMessage(`AI updated your skills and skill gaps for ${targetRole}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to analyze target role'); }
    finally { setIsAnalyzing(false); }
  };

  const addSkill = async () => {
    const name = newSkill.trim();
    if (!name) return;
    try {
      const response = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, level: 50, category: 'Career' }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add skill');
      setSkills((current) => [...current, data.skill]); setNewSkill(''); setShowSkillForm(false); setMessage(`${name} added at 50%. Adjust the slider to your actual level.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add skill'); }
  };

  const addRecommendedSkill = async (skill: RecommendedSkill) => {
    try {
      const response = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: skill.name, category: skill.category, level: skill.progress, targetLevel: skill.targetLevel }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to add skill');
      setSkills((current) => [...current, data.skill]);
      setRecommendedSkills((current) => current.filter((item) => item.name !== skill.name));
      setMessage(`${skill.name} added at ${skill.progress}%.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add skill'); }
  };

  const updateSkill = async (skill: Skill, progress: number) => {
    setSkills((current) => current.map((item) => item.id === skill.id || item.name === skill.name ? { ...item, level: progress, progress } : item));
    if (!skill.id) return;
    await fetch(`/api/skills/${skill.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: progress, progress }) });
  };

  const generateResume = async () => {
    setResumeLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resumeForm) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to generate resume');
      setResumeText(data.resumeText || '');
      setMessage('ATS-friendly resume generated and saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate resume'); }
    finally { setResumeLoading(false); }
  };

  const updateResumeField = (field: keyof typeof resumeForm, value: string) => setResumeForm((current) => ({ ...current, [field]: value }));

  const readiness = useMemo(() => skills.length ? Math.round(skills.reduce((sum, skill) => sum + (skill.progress ?? skill.level), 0) / skills.length) : 0, [skills]);

  if (isLoading) return <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">Loading your career workspace…</div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><Badge variant="secondary" className="mb-3 gap-1"><Sparkles className="h-3 w-3" /> Career workspace</Badge><h2 className="text-2xl font-bold tracking-tight">Turn learning into your next opportunity.</h2><p className="mt-1 text-muted-foreground">Track your skills, close the gaps, and follow a focused path toward your target role.</p></div>
        <Button onClick={() => setShowRoadmapDialog(true)} disabled={isSaving} className="gap-2"><Sparkles className="h-4 w-4" /> Generate roadmap</Button>
      </div>
      {message && <div className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-600 to-violet-700 text-white"><CardHeader><CardDescription className="text-indigo-100">Target role</CardDescription><div className="flex items-center gap-3"><BriefcaseBusiness className="h-7 w-7" /><Input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void analyzeTargetRole(); } }} className="border-white/20 bg-white/10 text-xl font-semibold text-white placeholder:text-indigo-200" /></div><Button variant="secondary" onClick={() => void analyzeTargetRole()} disabled={isAnalyzing || !targetRole.trim()} className="mt-3 w-full">{isAnalyzing ? 'Analyzing role…' : 'Enter / Analyze target role'}</Button></CardHeader><CardContent><div className="flex items-center justify-between text-sm text-indigo-100"><span>Role readiness</span><span className="font-semibold text-white">{readiness}%</span></div><Progress value={readiness} className="mt-2 bg-white/20 [&>div]:bg-white" /><p className="mt-4 text-sm text-indigo-100">AI updates recommended skills and gaps for this role while preserving your progress.</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-accent-500" /> Career goal</CardTitle><CardDescription>Keep one concrete outcome in view.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={goal} onChange={(event) => setGoal(event.target.value)} onBlur={() => void saveCareer()} /><div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Saved automatically when you leave the field</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Current skills</CardTitle><CardDescription>You choose your real current level. AI only recommends the target level.</CardDescription></CardHeader><CardContent className="space-y-5">{skills.map((skill) => <div key={skill.id || skill.name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{skill.name}<span className="ml-2 text-xs text-muted-foreground">target {skill.targetLevel ?? 100}%</span></span><span className="text-muted-foreground">{Math.round(skill.progress ?? skill.level)}%</span></div><input aria-label={`${skill.name} level`} type="range" min="0" max="100" value={skill.progress ?? skill.level} onChange={(event) => void updateSkill(skill, Number(event.target.value))} className="w-full accent-indigo-600" /></div>)}{showSkillForm ? <div className="flex gap-2"><Input autoFocus placeholder="e.g. TypeScript" value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addSkill(); }} /><Button onClick={() => void addSkill()}>Add</Button><Button variant="ghost" onClick={() => setShowSkillForm(false)}>Cancel</Button></div> : <Button variant="outline" onClick={() => setShowSkillForm(true)} className="w-full gap-2"><Plus className="h-4 w-4" /> Add skill</Button>}{recommendedSkills.length > 0 && <div className="space-y-3 border-t pt-4"><p className="text-sm font-semibold">Recommended skills — choose your level before adding</p>{recommendedSkills.map((skill) => <div key={skill.name} className="rounded-lg border p-3"><div className="flex justify-between text-sm"><span className="font-medium">{skill.name}</span><span>{skill.progress}% / target {skill.targetLevel}%</span></div><input aria-label={`${skill.name} starting level`} type="range" min="0" max="100" value={skill.progress} onChange={(event) => setRecommendedSkills((current) => current.map((item) => item.name === skill.name ? { ...item, progress: Number(event.target.value) } : item))} className="my-2 w-full accent-indigo-600" /><Button size="sm" variant="outline" onClick={() => void addRecommendedSkill(skill)}>Add at {skill.progress}%</Button></div>)}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-rose-500" /> AI skill gap</CardTitle><CardDescription>Gaps for {targetRole}, based on your chosen levels.</CardDescription></CardHeader><CardContent className="space-y-3">{gaps.map((gap) => <div key={gap} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-3"><span className="font-medium">{gap}</span><Button variant="ghost" size="sm" onClick={() => { const nextGoal = `Become job-ready in ${gap} for ${targetRole}`; setGoal(nextGoal); void saveCareer({ careerGoal: nextGoal }); }}>Set goal</Button></div>)}<Button className="mt-2 w-full gap-2" onClick={() => setShowRoadmapDialog(true)} disabled={isSaving}><Lightbulb className="h-4 w-4" /> Build my learning path</Button></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Recommended path</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p><span className="font-semibold">1.</span> Build a REST API with auth</p><p><span className="font-semibold">2.</span> Add automated tests</p><p><span className="font-semibold">3.</span> Deploy and document it</p></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Recommended roles</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { const role = 'Frontend Developer'; setTargetRole(role); void saveCareer({ targetRole: role }); }}>Frontend Developer</Button><Button variant="outline" size="sm" onClick={() => { const role = 'Full Stack Developer'; setTargetRole(role); void saveCareer({ targetRole: role }); }}>Full Stack Developer</Button><Button variant="outline" size="sm" onClick={() => { const role = 'Node.js Developer'; setTargetRole(role); void saveCareer({ targetRole: role }); }}>Node.js Developer</Button></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Resume profile</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Answer a few questions and generate an ATS-friendly resume.</p><Button variant="outline" className="w-full" onClick={() => setResumeOpen(true)}>Create ATS resume</Button>{resumeText && <p className="mt-3 text-xs text-emerald-600">Saved resume ready to review.</p>}</CardContent></Card></div>

      {roadmap.length > 0 && <Card className="border-accent-500/30"><CardHeader><CardTitle>Roadmap preview for {targetRole}</CardTitle><CardDescription>Review the plan before anything is added to your Tasks page or Calendar.</CardDescription></CardHeader><CardContent className="space-y-3">{roadmap.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-lg border p-3"><div className="flex items-center justify-between"><p className="font-medium">{index + 1}. {item.title}</p><Badge variant="secondary">Day {item.dayOffset} · {item.minutes} min</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.focus}</p></div>)}<Button onClick={() => void addRoadmapToTasks()} disabled={isRoadmapLoading} className="w-full">{isRoadmapLoading ? 'Adding roadmap…' : 'Add this roadmap to Tasks and Calendar'}</Button></CardContent></Card>}

      <Dialog open={showRoadmapDialog} onOpenChange={setShowRoadmapDialog}><DialogContent><DialogHeader><DialogTitle>How much time do you have?</DialogTitle><DialogDescription>The AI will fit your target-role roadmap into this timeframe and show you a preview first.</DialogDescription></DialogHeader><div className="space-y-2"><label htmlFor="roadmap-timeframe" className="text-sm font-medium">Available time (days)</label><Input id="roadmap-timeframe" type="number" min={7} max={365} value={timeframeDays} onChange={(event) => setTimeframeDays(event.target.value)} /><p className="text-xs text-muted-foreground">Choose between 7 and 365 days.</p></div><Button onClick={() => void generateRoadmapPreview()} disabled={isSaving || Number(timeframeDays) < 7}>Generate roadmap preview</Button></DialogContent></Dialog>

      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Create your ATS resume</DialogTitle><DialogDescription>Share your real details. The AI formats them for applicant tracking systems and does not invent experience.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Full name" value={resumeForm.fullName} onChange={(event) => updateResumeField('fullName', event.target.value)} /><Input placeholder="Target role" value={resumeForm.targetRole} onChange={(event) => updateResumeField('targetRole', event.target.value)} /><Input placeholder="Phone" value={resumeForm.phone} onChange={(event) => updateResumeField('phone', event.target.value)} /><Input placeholder="Location" value={resumeForm.location} onChange={(event) => updateResumeField('location', event.target.value)} /><Textarea className="md:col-span-2" placeholder="Professional summary" value={resumeForm.summary} onChange={(event) => updateResumeField('summary', event.target.value)} /><Textarea className="md:col-span-2" placeholder="Experience (one role or achievement per line)" value={resumeForm.experience} onChange={(event) => updateResumeField('experience', event.target.value)} /><Textarea className="md:col-span-2" placeholder="Education" value={resumeForm.education} onChange={(event) => updateResumeField('education', event.target.value)} /><Textarea className="md:col-span-2" placeholder="Projects and measurable results" value={resumeForm.projects} onChange={(event) => updateResumeField('projects', event.target.value)} /><Textarea className="md:col-span-2" placeholder="Skills separated by commas" value={resumeForm.skills} onChange={(event) => updateResumeField('skills', event.target.value)} /></div><Button onClick={() => void generateResume()} disabled={resumeLoading || !resumeForm.fullName || !resumeForm.targetRole} className="w-full">{resumeLoading ? 'Generating ATS resume…' : 'Generate ATS resume'}</Button>{resumeText && <div className="rounded-lg border bg-muted/30 p-4"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">Generated resume</p><Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(resumeText)}>Copy</Button></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-sm">{resumeText}</pre></div>}</DialogContent></Dialog>
    </div>
  );
}
