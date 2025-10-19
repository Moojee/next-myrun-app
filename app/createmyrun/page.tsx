"use client";

import { useState, ChangeEvent, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type FormState = {
  runDate: string;
  runDistance: string;
  runPlace: string;
  file: File | null;
  previewUrl: string | null; // blob URL
};

export default function CreateMyRunPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    runDate: "",
    runDistance: "",
    runPlace: "",
    file: null,
    previewUrl: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const onChange =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
    };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = ""; // ให้เลือกไฟล์ชื่อเดิมซ้ำได้

    if (!f) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
      setForm((p) => ({ ...p, file: null, previewUrl: null }));
      return;
    }

    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) {
      setErrors((p) => ({ ...p, file: "กรุณาเลือกรูป PNG / JPG / WEBP / GIF" }));
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(f);
    setObjectUrl(url);
    setForm((p) => ({ ...p, file: f, previewUrl: url }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.runDate) e.runDate = "กรุณาใส่วันที่วิ่ง";
    if (!form.runDistance) e.runDistance = "กรุณาใส่ระยะทาง";
    else if (Number.isNaN(Number(form.runDistance)) || Number(form.runDistance) <= 0)
      e.runDistance = "ระยะทางต้องเป็นตัวเลขมากกว่า 0";
    if (!form.runPlace) e.runPlace = "กรุณาใส่สถานที่วิ่ง";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      let imageUrl: string | null = null;

      // 1) อัปโหลดรูป (ไม่แยกโฟลเดอร์)
      if (form.file) {
        const filename = `${Date.now()}-${form.file.name}`.replace(/\s+/g, "-");
        const { error: upErr } = await supabase
          .storage
          .from("myrun_bk")
          .upload(filename, form.file, { upsert: true });
        if (upErr) {
          alert("อัปโหลดรูปไม่สำเร็จ");
          console.log(upErr);
          return;
        }

        // 2) ประกอบ URL เต็มเอง (public)
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!baseUrl) {
          alert("NEXT_PUBLIC_SUPABASE_URL ไม่ถูกตั้งค่า");
          return;
        }
        imageUrl = `${baseUrl}/storage/v1/object/public/myrun_bk/${filename}`;
        console.log("✅ will save imageUrl =", imageUrl);
      }

      // 3) บันทึกลงตาราง
      const { data, error: insErr } = await supabase
        .from("myrun_tb")
        .insert([
          {
            run_date: form.runDate,
            run_distance: Number(form.runDistance),
            run_place: form.runPlace,
            run_image_url: imageUrl, // ต้องเป็น URL เต็ม
          },
        ])
        .select();

      if (insErr) {
        alert("บันทึกข้อมูลไม่สำเร็จ");
        console.log(insErr);
        return;
      }

      console.log("✅ inserted row:", data);
      alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
      router.push("/showallmyrun");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 md:px-10 lg:px-20 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-10">
        <h1 className="text-center text-2xl md:text-3xl font-semibold text-gray-800">
          เพิ่มข้อมูลการวิ่งของฉัน
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* วันที่ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่วิ่ง</label>
            <input
              type="date"
              value={form.runDate}
              onChange={onChange("runDate")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-gray-400"
            />
            {errors.runDate && <p className="mt-1 text-sm text-red-600">{errors.runDate}</p>}
          </div>

          {/* ระยะทาง */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ระยะทาง (กม.)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.runDistance}
              onChange={onChange("runDistance")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-gray-400"
            />
            {errors.runDistance && <p className="mt-1 text-sm text-red-600">{errors.runDistance}</p>}
          </div>

          {/* สถานที่ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่วิ่ง</label>
            <input
              type="text"
              value={form.runPlace}
              onChange={onChange("runPlace")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-gray-400"
            />
            {errors.runPlace && <p className="mt-1 text-sm text-red-600">{errors.runPlace}</p>}
          </div>

          {/* อัปโหลด + พรีวิว */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รูปภาพประกอบ (ไม่บังคับ)</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 border border-gray-200 flex items-center justify-center rounded-xl overflow-hidden">
                {form.previewUrl ? (
                  <img
                    key={form.previewUrl ?? ""}
                    src={form.previewUrl}
                    alt="preview"
                    width={96}
                    height={96}
                    style={{ objectFit: "cover", width: 96, height: 96 }}
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Preview</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
                >
                  เลือกรูปภาพ
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={onFileChange}
                />
                {form.previewUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, file: null, previewUrl: null }))
                    }
                    className="rounded-xl bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                  >
                    ลบรูปที่เลือก
                  </button>
                )}
              </div>
            </div>
            {errors.file && <p className="mt-2 text-sm text-red-600">{errors.file}</p>}
          </div>

          {/* ปุ่ม */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-2xl bg-gray-900 px-6 py-3 text-white hover:bg-black"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกการวิ่ง"}
            </button>

            <Link
              href="/showallmyrun"
              className="w-full sm:w-auto rounded-2xl bg-gray-200 px-6 py-3 text-gray-800 hover:bg-gray-300"
            >
              กลับหน้าการวิ่งของฉัน
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
