import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Button, Card, Input } from '../../components/ui';
import { createQuiz, updateQuiz, getQuiz, deleteQuiz } from '../../services/courseService';
import type { QuizQuestion } from '../../types';

export function QuizFormPage() {
    const { courseId, quizId } = useParams();
    const isEditing = Boolean(quizId);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
    const [passingScore, setPassingScore] = useState(70);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingQuiz, setLoadingQuiz] = useState(isEditing);

    useEffect(() => {
        if (isEditing && quizId) {
            loadQuiz(quizId);
        }
    }, [quizId, isEditing]);

    async function loadQuiz(id: string) {
        try {
            const quiz = await getQuiz(id);
            if (quiz) {
                setTitle(quiz.title);
                setDescription(quiz.description);
                setTimeLimit(quiz.timeLimit);
                setPassingScore(quiz.passingScore);
                setQuestions(quiz.questions);
            }
        } catch (error) {
            console.error('Failed to load quiz:', error);
        } finally {
            setLoadingQuiz(false);
        }
    }

    function addQuestion() {
        const newQuestion: QuizQuestion = {
            id: `q_${Date.now()}`,
            question: '',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            points: 1,
        };
        setQuestions([...questions, newQuestion]);
    }

    function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
        setQuestions(
            questions.map((q, i) => (i === index ? { ...q, ...updates } : q))
        );
    }

    function updateOption(questionIndex: number, optionIndex: number, value: string) {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].options[optionIndex] = value;
        setQuestions(updatedQuestions);
    }

    function removeQuestion(index: number) {
        setQuestions(questions.filter((_, i) => i !== index));
    }

    function addOption(questionIndex: number) {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].options.push('');
        setQuestions(updatedQuestions);
    }

    function removeOption(questionIndex: number, optionIndex: number) {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options.filter(
            (_, i) => i !== optionIndex
        );
        // Adjust correct answer if needed
        if (updatedQuestions[questionIndex].correctOptionIndex >= optionIndex) {
            updatedQuestions[questionIndex].correctOptionIndex = Math.max(
                0,
                updatedQuestions[questionIndex].correctOptionIndex - 1
            );
        }
        setQuestions(updatedQuestions);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!courseId || !title.trim() || questions.length === 0) return;

        // Validate questions
        const invalidQuestions = questions.filter(
            (q) => !q.question.trim() || q.options.some((o) => !o.trim())
        );
        if (invalidQuestions.length > 0) {
            alert('Please fill in all questions and options');
            return;
        }

        setLoading(true);
        try {
            if (isEditing && quizId) {
                await updateQuiz(quizId, {
                    title,
                    description,
                    timeLimit,
                    passingScore,
                    questions,
                });
            } else {
                await createQuiz(courseId, {
                    title,
                    description,
                    timeLimit,
                    passingScore,
                    questions,
                });
            }
            navigate(`/courses/${courseId}`);
        } catch (error) {
            console.error('Failed to save quiz:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!quizId || !confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await deleteQuiz(quizId);
            navigate(`/courses/${courseId}`);
        } catch (error) {
            console.error('Failed to delete quiz:', error);
        }
    }

    if (loadingQuiz) {
        return (
            <PageLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid var(--border-default)',
                            borderTopColor: 'var(--accent)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: 'var(--text-secondary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        padding: 0,
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <ArrowLeft size={16} />
                    Back to Course
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {isEditing ? 'Edit Quiz' : 'Create Quiz'}
                    </h1>
                    {isEditing && (
                        <Button variant="danger" onClick={handleDelete}>
                            <Trash2 size={16} /> Delete Quiz
                        </Button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Quiz Settings */}
                <Card style={{ marginBottom: 'var(--space-6)' }}>
                    <h2
                        style={{
                            fontSize: 'var(--text-lg)',
                            fontWeight: 'var(--font-medium)',
                            color: 'var(--text-primary)',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        Quiz Settings
                    </h2>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 'var(--space-4)',
                        }}
                    >
                        <Input
                            label="Quiz Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Module 1 Assessment"
                            required
                        />
                        <Input
                            label="Time Limit (minutes, optional)"
                            type="number"
                            value={timeLimit || ''}
                            onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="No limit"
                            min={1}
                        />
                        <Input
                            label="Passing Score (%)"
                            type="number"
                            value={passingScore}
                            onChange={(e) => setPassingScore(Number(e.target.value))}
                            min={0}
                            max={100}
                        />
                    </div>
                    <div style={{ marginTop: 'var(--space-4)' }}>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-2)',
                            }}
                        >
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Instructions for students..."
                            rows={2}
                            style={{
                                width: '100%',
                                padding: 'var(--space-3)',
                                fontSize: 'var(--text-sm)',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>
                </Card>

                {/* Questions */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h2
                            style={{
                                fontSize: 'var(--text-lg)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Questions ({questions.length})
                        </h2>
                        <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={addQuestion}>
                            Add Question
                        </Button>
                    </div>

                    {questions.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                                    No questions yet. Add your first question to get started.
                                </p>
                                <Button type="button" icon={<Plus size={16} />} onClick={addQuestion}>
                                    Add First Question
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {questions.map((question, qIndex) => (
                                <Card key={question.id}>
                                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                        <GripVertical size={18} style={{ color: 'var(--text-muted)', marginTop: '10px' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                                                <span
                                                    style={{
                                                        fontSize: 'var(--text-sm)',
                                                        fontWeight: 'var(--font-medium)',
                                                        color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    Question {qIndex + 1}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    <Input
                                                        label=""
                                                        type="number"
                                                        value={question.points}
                                                        onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                                                        style={{ width: '80px' }}
                                                        min={1}
                                                    />
                                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>points</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIndex)}
                                                        style={{
                                                            padding: 'var(--space-2)',
                                                            background: 'none',
                                                            border: '1px solid var(--border-default)',
                                                            cursor: 'pointer',
                                                            color: 'var(--danger)',
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <textarea
                                                value={question.question}
                                                onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                                                placeholder="Enter your question..."
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--space-3)',
                                                    fontSize: 'var(--text-sm)',
                                                    border: '1px solid var(--border-default)',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit',
                                                    marginBottom: 'var(--space-4)',
                                                }}
                                            />

                                            {/* Options */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                                                    Options (click to mark correct answer)
                                                </span>
                                                {question.options.map((option, oIndex) => (
                                                    <div
                                                        key={oIndex}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--space-2)',
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuestion(qIndex, { correctOptionIndex: oIndex })}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor:
                                                                    question.correctOptionIndex === oIndex
                                                                        ? 'var(--success)'
                                                                        : 'var(--bg-secondary)',
                                                                border: `1px solid ${question.correctOptionIndex === oIndex ? 'var(--success)' : 'var(--border-default)'}`,
                                                                cursor: 'pointer',
                                                                color:
                                                                    question.correctOptionIndex === oIndex
                                                                        ? 'white'
                                                                        : 'var(--text-muted)',
                                                            }}
                                                        >
                                                            {question.correctOptionIndex === oIndex && <Check size={14} />}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                            placeholder={`Option ${oIndex + 1}`}
                                                            style={{
                                                                flex: 1,
                                                                padding: 'var(--space-2) var(--space-3)',
                                                                fontSize: 'var(--text-sm)',
                                                                border: '1px solid var(--border-default)',
                                                                backgroundColor: 'var(--bg-primary)',
                                                                color: 'var(--text-primary)',
                                                            }}
                                                        />
                                                        {question.options.length > 2 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOption(qIndex, oIndex)}
                                                                style={{
                                                                    padding: 'var(--space-1)',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: 'var(--text-muted)',
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addOption(qIndex)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-1)',
                                                        padding: 'var(--space-2)',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--accent)',
                                                        fontSize: 'var(--text-sm)',
                                                    }}
                                                >
                                                    <Plus size={14} /> Add Option
                                                </button>
                                            </div>

                                            {/* Explanation */}
                                            <div style={{ marginTop: 'var(--space-4)' }}>
                                                <input
                                                    type="text"
                                                    value={question.explanation || ''}
                                                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                                                    placeholder="Explanation (optional) - shown after answering"
                                                    style={{
                                                        width: '100%',
                                                        padding: 'var(--space-2) var(--space-3)',
                                                        fontSize: 'var(--text-sm)',
                                                        border: '1px solid var(--border-default)',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        position: 'sticky',
                        bottom: 0,
                    }}
                >
                    <Button type="submit" loading={loading} disabled={questions.length === 0}>
                        {isEditing ? 'Save Changes' : 'Create Quiz'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                        Cancel
                    </Button>
                    {questions.length > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            Total: {questions.reduce((sum, q) => sum + q.points, 0)} points
                        </span>
                    )}
                </div>
            </form>
        </PageLayout>
    );
}
