import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string;
  textColor?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient,
  textColor = 'text-white',
  trend,
  trendValue
}: StatsCardProps) {
  return (
    <div className={`${gradient} rounded-xl p-6 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
        <Icon className="w-24 h-24" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${textColor} text-sm font-medium opacity-90`}>{title}</h3>
          <div className={`w-10 h-10 ${textColor.replace('text-', 'bg-').replace('white', 'white/20')} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${textColor}`} />
          </div>
        </div>
        
        <div className={`${textColor} text-2xl sm:text-3xl font-bold mb-2 leading-tight`}>
          {value}
        </div>
        
        <div className="flex items-center justify-between">
          {subtitle && (
            <p className={`${textColor} text-sm opacity-80`}>{subtitle}</p>
          )}
          
          {trend && trendValue && (
            <div className={`flex items-center space-x-1 ${textColor} opacity-90`}>
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-xl" />
    </div>
  );
}