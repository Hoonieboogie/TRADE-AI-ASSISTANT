import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, RotateCcw, Filter, ChevronDown, Check, Calendar } from 'lucide-react';
import { DocumentData } from '../App';

export interface Version {
  id: string;
  timestamp: number;
  data: DocumentData;
  step: number;
}

interface VersionHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Version[];
  onRestore?: (version: Version) => void;
  currentStep?: number;
}

export default function VersionHistorySidebar({
  isOpen,
  onClose,
  versions,
  onRestore,
  currentStep = 1
}: VersionHistorySidebarProps) {
  const [selectedFilter, setSelectedFilter] = useState<number | 'all'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Update filter when sidebar opens
  useEffect(() => {
    if (isOpen) {
      if (versions.length > 0) {
        // Find the most recent version
        const lastVersion = versions.reduce((prev, current) =>
          (prev.timestamp > current.timestamp) ? prev : current
        );
        setSelectedFilter(lastVersion.step);
      } else {
        setSelectedFilter('all');
      }
    }
  }, [isOpen]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '방금 전';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const formatActualDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTemplateName = (step: number) => {
    switch (step) {
      case 1: return 'Offer Sheet';
      case 2: return 'Proforma Invoice (PI)';
      case 3: return 'Sales Contract';
      case 4: return 'Commercial Invoice';
      case 5: return 'Packing List';
      default: return 'Unknown Document';
    }
  };

  const filteredVersions = versions
    .filter(v => selectedFilter === 'all' || v.step === selectedFilter)
    .sort((a, b) => b.timestamp - a.timestamp);

  const filterOptions = [
    { value: 'all', label: '전체 문서 보기' },
    { value: 1, label: 'Offer Sheet' },
    { value: 2, label: 'Proforma Invoice (PI)' },
    { value: 3, label: 'Sales Contract' },
    { value: 4, label: 'Commercial Invoice' },
    { value: 5, label: 'Packing List' }
  ];

  const currentFilterLabel = filterOptions.find(o => o.value === selectedFilter)?.label;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[400px] bg-white/80 backdrop-blur-xl shadow-2xl z-[70] border-r border-white/20 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-md sticky top-0 z-30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-gray-900">버전 기록</h2>
                    <p className="text-xs text-gray-500 font-medium">히스토리 및 복원</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>

              {/* Custom Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full p-3 pl-4 pr-4 bg-white border border-gray-200 hover:border-blue-300 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-between transition-all shadow-sm hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-500" />
                    <span>{currentFilterLabel}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 max-h-[300px] overflow-y-auto"
                    >
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedFilter(option.value as number | 'all');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${selectedFilter === option.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'
                            }`}
                        >
                          {option.label}
                          {selectedFilter === option.value && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Version List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {filteredVersions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">저장된 버전이 없습니다.</p>
                </div>
              ) : (
                filteredVersions.map((version, index) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative pl-6"
                  >
                    {/* Timeline Line */}
                    <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-gray-200 group-last:bottom-auto group-last:h-full" />

                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-6 w-4 h-4 rounded-full border-[3px] border-white bg-gray-300 group-hover:bg-blue-500 group-hover:scale-110 transition-all shadow-sm z-10" />

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group-hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold tracking-wider uppercase border border-blue-100">
                              Version {versions.length - versions.indexOf(version)}
                            </span>
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(version.timestamp)}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">
                            {version.data.title || '제목 없음'}
                          </h3>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:bg-blue-50/30 group-hover:border-blue-100/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <p className="text-sm font-semibold text-gray-700">
                            {getTemplateName(version.step)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 pl-3.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatActualDate(version.timestamp)}
                        </p>
                      </div>

                      <button
                        onClick={() => onRestore && onRestore(version)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:shadow-blue-200 transition-all duration-200 active:scale-[0.98]"
                      >
                        <RotateCcw className="w-4 h-4" />
                        이 버전으로 복원
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
