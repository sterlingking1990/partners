'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  ChevronLeft, 
  Loader2, 
  ClipboardList, 
  AlertCircle,
  CheckCircle2,
  Send,
  ArrowRight,
  Star,
  Sparkles,
  Video,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

export default function CampaignDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<any>(null)

  // Survey State
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // Challenge State
  const [challenge, setChallenge] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [hasIncrementedView, setHasIncrementedView] = useState(false)

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      // Fetch campaign (status_post)
      const { data: camp, error: campError } = await supabase
        .from('status_posts')
        .select(`
          *,
          profiles:brand_id (id, username, avatar_url, full_name)
        `)
        .eq('id', id)
        .single()

      if (campError) throw campError

      // Fetch brand separately since it's not a direct relation on brand_id
      const { data: brandData } = await supabase
        .from('brands')
        .select('company_name, verification_status')
        .eq('profile_id', camp.brand_id)
        .maybeSingle()

      // Merge brand data into campaign
      const enrichedCamp = {
          ...camp,
          brands: brandData
      }

      setCampaign(enrichedCamp)

      if (camp.type === 'survey') {
        // Fetch survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('status_post_id', id)
          .single()

        if (surveyError) throw surveyError
        setSurvey(surveyData)

        // Check if already completed
        const { data: existingResponse } = await supabase
          .from('survey_responses')
          .select('id')
          .eq('survey_id', surveyData.id)
          .eq('respondent_id', authUser.id)
          .maybeSingle()

        if (existingResponse) {
          setAlreadyCompleted(true)
        }

        // Fetch questions
        const { data: questionsData, error: qError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyData.id)
          .order('order_index', { ascending: true })

        if (qError) throw qError
        setQuestions(questionsData)

        // Increment view count
        incrementViewCount(camp.id, authUser.id, 'survey')
      } else if (camp.type === 'challenge') {
        // Fetch challenge
        const { data: challengeData, error: challengeError } = await supabase
          .from('challenges')
          .select('*')
          .eq('status_post_id', id)
          .single()

        if (challengeError) throw challengeError
        setChallenge(challengeData)

        // Check for existing submission
        const { data: existingSubmission } = await supabase
          .from('challenge_submissions')
          .select('id')
          .eq('challenge_id', challengeData.id)
          .eq('participant_id', authUser.id)
          .maybeSingle()

        if (existingSubmission) {
          setAlreadyCompleted(true)
        }

        // Increment view count
        incrementViewCount(camp.id, authUser.id, 'challenge')
      }

    } catch (err) {
      console.error('Error fetching campaign details:', err)
      setToastType('error')
      setToastMessage('Failed to load campaign details.')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }

  const incrementViewCount = async (statusPostId: string, userId: string, type: 'survey' | 'challenge') => {
    try {
      if (type === 'survey') {
          // record_survey_view handles uniqueness and view_count
          await supabase.rpc('record_survey_view', {
            p_status_id: statusPostId,
            p_user_id: userId
          })
      } else {
          // record_challenge_view handles uniqueness and view_count
          await supabase.rpc('record_challenge_view', {
            p_status_id: statusPostId,
            p_viewer_id: userId,
          })
      }

      setHasIncrementedView(true)
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }

  const handleAnswer = (questionId: string, answer: any, option?: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))

    supabase.rpc('log_activity', {
        p_action_type: 'survey_question_answered',
        p_resource_type: 'survey',
        p_resource_id: survey?.id,
        p_metadata: {
            survey_title: campaign?.title,
            question_id: questionId,
            answer_type: typeof answer,
            has_skip_logic: !!option?.next_question_id
        },
        p_user_id: user?.id
    })

    if (option?.next_question_id) {
        if (option.next_question_id === 'end') {
          setCurrentQuestionIndex(questions.length)
        } else if (option.next_question_id === 'no-skip') {
          if (currentQuestionIndex + 1 >= questions.length) {
            setCurrentQuestionIndex(questions.length)
          } else {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
          }
        } else {
          const nextIdx = questions.findIndex(q => q.id === option.next_question_id)
          if (nextIdx !== -1) {
            setCurrentQuestionIndex(nextIdx)
          } else {
            setCurrentQuestionIndex(questions.length)
          }
        }
    } else {
        if (currentQuestionIndex + 1 >= questions.length) {
            setCurrentQuestionIndex(questions.length)
        } else {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src)
          const maxDuration = challenge?.max_duration || 30
          if (video.duration > maxDuration + 1) { // 1s buffer
            setToastType('error')
            setToastMessage(`Video is too long. Maximum allowed duration is ${maxDuration} seconds.`)
            setShowToast(true)
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
          }
          setSelectedFile(file)
          const url = URL.createObjectURL(file)
          setPreviewUrl(url)
        }
        video.src = URL.createObjectURL(file)
      } else {
        setSelectedFile(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    }
  }

  const uploadMedia = async (file: File) => {
    const fileName = `${user.id}_${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('challenge-submissions')
      .upload(fileName, file)

    if (error) throw error

    const { data: publicUrlData } = supabase.storage
      .from('challenge-submissions')
      .getPublicUrl(data.path)

    return publicUrlData.publicUrl
  }

  const submitChallenge = async () => {
    if (alreadyCompleted || submitting) return
    if (!selectedFile) {
        setToastType('error')
        setToastMessage('Please select a file.')
        setShowToast(true)
        return
    }
    if (!caption.trim()) {
        setToastType('error')
        setToastMessage('Please add a caption.')
        setShowToast(true)
        return
    }

    setSubmitting(true)
    try {
        const mediaUrl = await uploadMedia(selectedFile)
        const fileType = selectedFile.type.startsWith('video') ? 'video' : 'image'

        const { error: submissionError } = await supabase
          .from('challenge_submissions')
          .insert({
            challenge_id: challenge.id,
            participant_id: user.id,
            submission_url: mediaUrl,
            submission_type: fileType,
            caption: caption.trim(),
            hashtags: campaign?.hashtags || [],
            group_id: challenge?.groupId || null,
            part_number: challenge?.partNumber || 1,
          })

        if (submissionError) throw submissionError

        await supabase.rpc('increment_participation_count', {
          p_status_id: campaign.id,
          p_participant_id: user.id,
        })

        setAlreadyCompleted(true)
        setToastType('success')
        setToastMessage('Challenge submitted! Your entry is now under review.')
        setShowToast(true)

        supabase.rpc('log_activity', {
            p_action_type: 'challenge_submission_successful',
            p_resource_type: 'challenge',
            p_resource_id: challenge?.id,
            p_metadata: {
                challenge_title: challenge?.challenge_prompt,
                media_type: fileType,
                reward_amount: campaign.reward_amount
            },
            p_user_id: user?.id
        })

        setTimeout(() => {
          router.push('/dashboard/campaigns')
        }, 3000)

    } catch (err: any) {
        console.error('Submission error:', err)
        setToastType('error')
        setToastMessage(err.message || 'Failed to submit challenge.')
        setShowToast(true)
    } finally {
        setSubmitting(false)
    }
  }

  const submitSurvey = async () => {
    if (alreadyCompleted || submitting) return

    setSubmitting(true)
    try {
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: survey.id,
          respondent_id: user.id,
        })
        .select()
        .single()

      if (responseError) throw responseError

      const answerInserts = Object.entries(answers).map(([questionId, answer]) => ({
        survey_response_id: responseData.id,
        question_id: questionId,
        answer_text: typeof answer === 'string' ? answer : (typeof answer === 'number' ? answer.toString() : null),
        answer_option: (typeof answer === 'string' && answer.length < 100) ? answer : null,
        answer_rating: typeof answer === 'number' ? answer : null,
      }))

      if (answerInserts.length > 0) {
          const { error: answersError } = await supabase
            .from('survey_answers')
            .insert(answerInserts)

          if (answersError) throw answersError
      }

      const { data: rewardData, error: rewardError } = await supabase.rpc('give_survey_reward', {
        p_survey_id: survey.id,
        p_respondent_id: user.id,
        p_reward_amount: campaign.reward_amount
      })

      if (rewardError) throw rewardError
      if (!rewardData.success) throw new Error(rewardData.error)

      setAlreadyCompleted(true)
      setToastType('success')
      setToastMessage(rewardData.reward_given
        ? `Survey submitted! You earned ${campaign.reward_amount} BC.`
        : 'Survey submitted! Thank you for your feedback.')
      setShowToast(true)

      supabase.rpc('log_activity', {
        p_action_type: 'survey_completed',
        p_resource_type: 'survey',
        p_resource_id: survey?.id,
        p_metadata: {
            survey_title: campaign?.title,
            reward_given: rewardData.reward_given,
            reward_amount: campaign.reward_amount
        },
        p_user_id: user?.id
      })

      setTimeout(() => {
        router.push('/dashboard/campaigns')
      }, 3000)

    } catch (err: any) {
      console.error('Submission error:', err)
      setToastType('error')
      setToastMessage(err.message || 'Failed to submit survey.')
      setShowToast(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-brand" size={40} />
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Campaign...</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-black text-gray-900">Campaign not found</h2>
        <p className="text-gray-500 mt-2">The campaign you are looking for does not exist or has been removed.</p>
        <button onClick={() => router.back()} className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">
          Go Back
        </button>
      </div>
    )
  }

  const isSurvey = campaign.type === 'survey'
  const isChallenge = campaign.type === 'challenge'
  const currentQuestion = questions[currentQuestionIndex]
  const isFinished = currentQuestionIndex >= questions.length

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} type={toastType} />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            {isSurvey ? <ClipboardList className="text-brand" size={20} /> : <Video className="text-brand" size={20} />}
            <h1 className="text-lg font-bold text-gray-800">{isSurvey ? 'Market Survey' : 'Video Challenge'}</h1>
          </div>
        </div>

        <div className="bg-brand/10 px-4 py-2 rounded-xl border border-brand/10">
           <span className="text-brand font-black text-xs uppercase tracking-widest">Earn {campaign.reward_amount} BC</span>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        {alreadyCompleted ? (
          <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl text-center space-y-6 animate-in zoom-in duration-300">
             <div className="h-24 w-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={48} />
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Already Participated</h2>
                <p className="text-gray-500 font-medium max-w-xs mx-auto italic">Thank you! You've already submitted your entry for this campaign. We'll notify you once it's reviewed.</p>
             </div>
             <button onClick={() => router.push('/dashboard/campaigns')} className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-brand transition-all shadow-xl active:scale-95">
                RETURN TO CAMPAIGNS
             </button>
          </div>
        ) : isChallenge ? (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/50">
                    <div className="space-y-2 mb-8">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{challenge?.challenge_prompt}</h2>
                        {challenge?.submission_guidelines && (
                            <p className="text-sm text-gray-500 italic font-medium">"{challenge.submission_guidelines}"</p>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* File Upload Area */}
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`
                            relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
                            ${previewUrl ? 'border-brand' : 'border-gray-200 hover:border-brand hover:bg-brand/5'}
                          `}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept="video/*,image/*" 
                            />

                            {previewUrl ? (
                                <>
                                    {selectedFile?.type.startsWith('video') ? (
                                        <video src={previewUrl} className="w-full h-full object-cover" controls />
                                    ) : (
                                        <img src={previewUrl} className="w-full h-full object-cover" />
                                    )}
                                    <button 
                                      onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedFile(null)
                                          setPreviewUrl(null)
                                      }}
                                      className="absolute top-4 right-4 h-10 w-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400 group-hover:text-brand group-hover:scale-110 transition-all">
                                        <Upload size={32} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Upload Video or Image</p>
                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">Max 100MB</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Caption Area */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add a Caption</label>
                            <textarea
                              value={caption}
                              onChange={(e) => setCaption(e.target.value)}
                              placeholder="Describe your entry..."
                              className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-2xl h-32 focus:bg-white focus:border-brand outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                            />
                        </div>

                        {campaign?.hashtags && campaign.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {campaign.hashtags.map((tag: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-brand/5 text-brand rounded-full text-[10px] font-black uppercase tracking-tighter">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                          onClick={submitChallenge}
                          disabled={submitting}
                          className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={24} /> : (
                              <>
                                <Send size={20} />
                                SUBMIT ENTRY
                              </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        ) : isSurvey ? (
            <div className="space-y-8 animate-in fade-in duration-500">
             {/* Progress Bar */}
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</p>
                   <p className="text-[10px] font-black text-brand uppercase tracking-widest">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</p>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-brand transition-all duration-500" 
                     style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                   />
                </div>
             </div>

             {isFinished ? (
                <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl text-center space-y-8 animate-in slide-in-from-bottom-4">
                    <div className="h-20 w-20 bg-brand/5 text-brand rounded-[1.5rem] flex items-center justify-center mx-auto">
                        <Send size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Ready to Submit?</h2>
                        <p className="text-gray-500 font-medium mt-2">You've answered all relevant questions. Submit now to claim your reward!</p>
                    </div>

                    <div className="space-y-4">
                        <button
                          onClick={submitSurvey}
                          disabled={submitting}
                          className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={24} /> : (
                              <>
                                <Sparkles size={20} />
                                SUBMIT SURVEY
                              </>
                            )}
                        </button>
                        <button 
                          onClick={() => setCurrentQuestionIndex(questions.length - 1)}
                          disabled={submitting}
                          className="w-full py-4 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
                        >
                            Review Answers
                        </button>
                    </div>
                </div>
             ) : currentQuestion ? (
                <>
                    {/* Question Card */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl shadow-gray-200/50">
                        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-8">
                        {currentQuestion.question_text}
                        {currentQuestion.is_required && <span className="text-red-500 ml-1">*</span>}
                        </h3>

                        <div className="space-y-4">
                        {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'yes_no') && currentQuestion.options?.map((option: any, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(currentQuestion.id, option.text, option)}
                                className={`w-full p-6 rounded-2xl text-left font-bold transition-all border-2 flex items-center justify-between group ${
                                answers[currentQuestion.id] === option.text 
                                    ? 'bg-brand/5 border-brand text-brand' 
                                    : 'bg-gray-50 border-transparent text-gray-700 hover:border-gray-200 hover:bg-white'
                                }`}
                            >
                                <span>{option.text}</span>
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    answers[currentQuestion.id] === option.text ? 'bg-brand border-brand' : 'border-gray-300'
                                }`}>
                                    {answers[currentQuestion.id] === option.text && <div className="h-2 w-2 bg-white rounded-full" />}
                                </div>
                            </button>
                        ))}

                        {currentQuestion.question_type === 'rating' && (
                            <div className="flex justify-center gap-3 py-8">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                    key={num}
                                    onClick={() => {
                                        setAnswers(prev => ({ ...prev, [currentQuestion.id]: num }))
                                        setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 300)
                                    }}
                                    className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all ${
                                        answers[currentQuestion.id] === num 
                                        ? 'bg-brand text-white shadow-lg shadow-brand/30 scale-110' 
                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                    >
                                    {num}
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentQuestion.question_type === 'text' && (
                            <div className="space-y-6">
                                <textarea
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                                placeholder="Type your answer here..."
                                className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-2xl h-40 focus:bg-white focus:border-brand outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
                                />
                                <button
                                onClick={() => {
                                    if (currentQuestion.is_required && !answers[currentQuestion.id]) {
                                    setToastMessage('Please provide an answer.')
                                    setShowToast(true)
                                    return
                                    }
                                    handleAnswer(currentQuestion.id, answers[currentQuestion.id])
                                }}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between px-2">
                        <button
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 disabled:opacity-0 transition-all flex items-center gap-1"
                        >
                        <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="flex items-center gap-1.5">
                        {questions.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 w-1.5 rounded-full transition-all ${
                                idx === currentQuestionIndex ? 'bg-brand w-4' : 'bg-gray-300'
                                }`} 
                            />
                        ))}
                        </div>
                        <div className="w-20" /> {/* Spacer */}
                    </div>
                </>
             ) : (
                <div className="py-20 text-center">
                    <p className="text-gray-500 font-bold italic">No questions found for this survey.</p>
                </div>
             )}
          </div>
        ) : null}
      </main>
    </div>
  )
}