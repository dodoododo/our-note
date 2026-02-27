import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, CheckSquare, Heart, Users, ArrowRight } from 'lucide-react';
import heroIllustration from '@/assets/family-illustration.png';

const features = [
  { icon: Users, title: 'Group Notes', description: 'Share notes with family, friends, or colleagues' },
  { icon: Calendar, title: 'Shared Calendar', description: 'Plan events and never miss important dates' },
  { icon: CheckSquare, title: 'Task Boards', description: 'Trello-style boards for organized productivity' },
  { icon: Heart, title: 'Couple Mode', description: 'Track your love journey together' },
];

const LandingPage = () => {
  return (
    // Changed background to white and default text color to a natural slate gray
    <div className="animate-fade-in bg-white text-slate-800">
        
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo looks untouched as requested */}
            <div
                className="w-14 h-14 rounded-2xl bg-linear-to-br from-pink-400 to-rose-500
                        flex items-center justify-center shadow-md
                        hover:scale-105 transition-transform duration-300 ease-out"
            >
                <Heart className="w-7 h-7 text-yellow-200 fill-yellow-200 opacity-90" />
            </div>

            {/* Removed text-foreground to inherit the new brighter slate-800 */}
            <span className="text-3xl font-bold leading-none">
                OurNote
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              {/* Added bright hover effect to ghost button */}
              <Button variant="ghost" className="hover:text-sky-600 hover:bg-sky-50">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              {/* Overrode default button colors with a bright, natural sky blue */}
              <Button className="bg-sky-500 hover:bg-sky-600 text-white border-none shadow-sm shadow-sky-200/50">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>
      <section className="container mx-auto px-15 py-10 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-slide-up">
            {/* Removed text-foreground. Changed text-primary to brighter text-sky-500 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Keep your loved ones <span className="text-sky-500">organized</span> together
            </h1>
            {/* Changed text-muted-foreground to a cleaner text-slate-500 */}
            <p className="text-lg text-slate-500 mb-8 max-w-lg">
              The all-in-one platform for families and couples to share notes, plan events, and manage tasks together.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/auth?mode=signup">
                 {/* Brighter primary button override */}
                <Button size="lg" className="h-12 px-8 text-lg bg-sky-500 hover:bg-sky-600 text-white border-none shadow-md shadow-sky-200/50">
                  Start Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                 {/* Brighter outline button override */}
                <Button variant="outline" size="lg" className="h-12 px-8 text-lg border-sky-200 text-sky-600 hover:bg-sky-50 hover:text-sky-700">View Demo</Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center animate-float">
            {heroIllustration ? (
                <img src={heroIllustration} alt="Family organizing" className="w-full max-w-md" />
            ) : (
                // Changed bg-secondary to a brighter, more natural slate-100
                <div className="w-full max-w-md h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    Illustration
                </div>
            )}
          </div>
        </div>
      </section>

      {/* Changed section bg from secondary/20 to a clean, bright slate-50 */}
      <section className="container mx-auto px-4 py-16 bg-slate-50/80">
        {/* Removed text-foreground */}
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            // Changed bg-card to bg-white, made border lighter and brighter
            <div key={i} className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-sky-100/50 transition-all duration-300">
              {/* Changed icon bg to bright sky-100 */}
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4">
                {/* Changed icon color to bright sky-500 */}
                <feature.icon className="h-6 w-6 text-sky-500" />
              </div>
              {/* Removed text-foreground */}
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              {/* Changed muted text to slate-500 */}
              <p className="text-sm text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
        </section>
        {/* Changed footer text to slate-500 and border to brighter slate-100 */}
        <footer className="container mx-auto px-4 py-10 text-center text-slate-500 border-t border-slate-100 mt-auto">
            <p className="text-xl">
            Made by{" "}
            <span className="font-semibold text-red-600">Vietnamese</span>{" "}
            <span className="bg-linear-to-r from-red-600 to-yellow-400 bg-clip-text text-transparent font-semibold">
                patriot NgocHau
            </span>
            </p>
            <p className="mt-2 text-x">
                © 2026 NgocHau · 
                <a href="https://github.com/dodoododo/our-note" target="_blank"className="underline underline-offset-4 hover:text-slate-800 ml-1">
                View on GitHub
                </a>
            </p>
        </footer>
    </div>
  );
};

export default LandingPage;