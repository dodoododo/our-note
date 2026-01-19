import React from 'react';
import { Heart, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays, differenceInMonths, differenceInYears, format } from 'date-fns';
import { motion } from 'framer-motion';

export default function CoupleAnniversary({ group }: { group: any }) {
  if (!group.couple_start_date) {
    return (
      <Card className="border-0 shadow-xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white overflow-hidden">
        <CardContent className="p-8 text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2">Set Your Anniversary Date</h3>
          <p className="opacity-80">Go to settings to add when you started your journey together</p>
        </CardContent>
      </Card>
    );
  }

  const startDate = new Date(group.couple_start_date);
  const today = new Date();
  
  const totalDays = differenceInDays(today, startDate);
  const years = differenceInYears(today, startDate);
  const months = differenceInMonths(today, startDate) % 12;
  const days = differenceInDays(today, startDate) % 30;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white overflow-hidden relative">
        {/* Floating hearts background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ 
                x: Math.random() * 100 + '%', 
                y: '110%',
                rotate: Math.random() * 360,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{ 
                y: '-10%',
                rotate: Math.random() * 360 + 180,
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'linear'
              }}
            >
              <Heart className="w-8 h-8 text-white/10" fill="currentColor" />
            </motion.div>
          ))}
        </div>

        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            {/* Main Counter */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="text-white/80 font-medium">Together Since</span>
              </div>
              <div className="text-5xl lg:text-6xl font-bold mb-2">
                {totalDays.toLocaleString()}
              </div>
              <p className="text-xl text-white/80">days of love ❤️</p>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-3 gap-6 lg:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">{years}</span>
                </div>
                <p className="text-sm text-white/80">Years</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">{months}</span>
                </div>
                <p className="text-sm text-white/80">Months</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">{days}</span>
                </div>
                <p className="text-sm text-white/80">Days</p>
              </div>
            </div>
          </div>

          {/* Anniversary Date */}
          <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-center gap-2 text-white/80">
            <Calendar className="w-4 h-4" />
            <span>Started on {format(startDate, 'MMMM d, yyyy')}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}