export default function ResumeLandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-4">Resume Builder</h1>
      <p className="text-muted-foreground mb-6">
        Create professional resumes with customizable templates, live preview, and easy export.
      </p>
      <div className="flex gap-4">
        <a href="/resume/builder" className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90">
          Open Builder
        </a>
        <a href="/profile" className="inline-flex items-center px-4 py-2 rounded-md border border-input hover:bg-accent hover:text-accent-foreground">
          Edit Profile Data
        </a>
      </div>
    </div>
  );
}


