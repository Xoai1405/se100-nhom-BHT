import { useState, useEffect } from "react";
import { learningApi } from "../services/learningApi";
import { storage } from "../../../utils/storage";

export const useLessonProgress = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [loading, setLoading] = useState(false);

  // Load danh sách khóa học
  useEffect(() => {
    learningApi.getCourses().then((data) => {
      setCourses(data);
      if (data.length > 0) setSelectedCourseId(data[0].id);
    });
  }, []);

  // Load bài học khi chọn khóa học
  useEffect(() => {
    if (!selectedCourseId) return;

    setLoading(true);
    // Kiểm tra cache localstorage trước
    const savedProgress = storage.getCourseProgress(selectedCourseId);

    if (savedProgress) {
      setLessons(savedProgress);
      setActiveLessonId(savedProgress[0]?.id || "");
      setLoading(false);
    } else {
      learningApi.getLessonsByCourse(selectedCourseId).then((data) => {
        setLessons(data);
        if (data.length > 0) setActiveLessonId(data[0].id);
        storage.saveCourseProgress(selectedCourseId, data);
        setLoading(false);
      });
    }
  }, [selectedCourseId]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;

  // Xử lý xem xong Video
  const handleVideoCompleted = async (lessonId) => {
    await learningApi.markVideoWatched(lessonId);

    setLessons((prev) => {
      const updated = prev.map((item) =>
        item.id === lessonId ? { ...item, videoWatched: true } : item,
      );
      storage.saveCourseProgress(selectedCourseId, updated);
      return updated;
    });
  };

  // Xử lý nộp bài Quiz & mở khóa bài tiếp theo
  const handleQuizSubmit = async (lessonId, userAnswers) => {
    const result = await learningApi.submitQuiz(
      lessonId,
      userAnswers,
      activeLesson?.questions || [],
    );

    if (result.isPassed) {
      setLessons((prev) => {
        const currentIndex = prev.findIndex((l) => l.id === lessonId);
        const updated = [...prev];

        // Đánh dấu bài hiện tại COMPLETED
        updated[currentIndex] = {
          ...updated[currentIndex],
          quizPassed: true,
          status: "COMPLETED",
        };

        // Mở khóa bài tiếp theo (nếu có)
        if (currentIndex + 1 < updated.length) {
          updated[currentIndex + 1] = {
            ...updated[currentIndex + 1],
            status: "UNLOCKED",
          };
        }

        storage.saveCourseProgress(selectedCourseId, updated);
        return updated;
      });
    }

    return result;
  };

  // Reset tiến độ test lại từ đầu
  const resetProgress = () => {
    if (!selectedCourseId) return;
    storage.clearCourseProgress(selectedCourseId);
    window.location.reload();
  };

  return {
    courses,
    selectedCourseId,
    setSelectedCourseId,
    lessons,
    activeLesson,
    setActiveLessonId,
    loading,
    handleVideoCompleted,
    handleQuizSubmit,
    resetProgress,
  };
};
