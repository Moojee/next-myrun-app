"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import runlogo from "./../../assets/images/runlogo.jpeg";

type MyRun = {
  id: string;
  created_at: string;
  run_date: string | null;
  run_distance: number | null;
  run_place: string | null;
  run_image_url: string | null;
};

function toObjectPath(src?: string | null): string | null {
  if (!src) return null;
  const s = src.trim();
  try {
    const u = new URL(s);
    const p = u.pathname;
    const SIGN_PREFIX = "/storage/v1/object/sign/";
    const PUB_PREFIX = "/storage/v1/object/public/";
    if (p.startsWith(SIGN_PREFIX)) {
      // /storage/v1/object/sign/myrun_bk/<file>
      return p.replace(SIGN_PREFIX, ""); // -> myrun_bk/<file>
    }
    if (p.startsWith(PUB_PREFIX)) {
      // /storage/v1/object/public/myrun_bk/<file>
      return p.replace(PUB_PREFIX, ""); // -> myrun_bk/<file>
    }
  } catch {}

  return s.includes("/") ? s : `myrun_bk/${s}`;
}

export default function Page() {
  const [rows, setRows] = useState<MyRun[]>([]);
  const [displayUrls, setDisplayUrls] = useState<Record<string, string | null>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("myrun_tb")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
      console.log(error.message);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as MyRun[];
    setRows(list);

    const ttl = 60 * 60 * 24 * 7;

    const urlMapEntries = await Promise.all(
      list.map(async (row) => {
        const objectPath = toObjectPath(row.run_image_url);
        if (!objectPath) return [row.id, null] as const;

        try {
          const { data: signed, error: signErr } = await supabase.storage
            .from("myrun_bk")
            .createSignedUrl(objectPath.replace(/^myrun_bk\//, ""), ttl);

          if (signErr) {
            console.warn("createSignedUrl error:", objectPath, signErr.message);
            return [row.id, null] as const;
          }
          return [row.id, signed?.signedUrl ?? null] as const;
        } catch (err) {
          console.warn("createSignedUrl exception:", objectPath, err);
          return [row.id, null] as const;
        }
      })
    );

    const map: Record<string, string | null> = {};
    for (const [id, url] of urlMapEntries) map[id] = url;

    setDisplayUrls(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleDelete = async (id: string) => {
    const ok = confirm("ต้องการลบข้อมูลนี้หรือไม่?");
    if (!ok) return;

    const { error } = await supabase.from("myrun_tb").delete().eq("id", id);
    if (error) {
      alert("ลบข้อมูลไม่สำเร็จ");
      console.log(error);
      return;
    }
    alert("ลบข้อมูลเรียบร้อยแล้ว");
    fetchRows();
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full px-4 sm:px-6 md:px-10 lg:px-20 py-10">
      <Image
        className=" mt-5 sm:mt-16 md:mt-20"
        src={runlogo}
        alt="Runlogo"
        width={150}
      />

      <h1 className="text-center text-2xl md:text-3xl font-semibold text-gray-800">
        การวิ่งของฉัน
      </h1>

      <div className="w-full sm:w-11/12 md:w-10/12 mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm md:text-base">
            <thead>
              <tr className="bg-gray-800 text-gray-100 uppercase">
                <th className="py-3">No.</th>
                <th className="py-3">วันที่วิ่ง</th>
                <th className="py-3">รูปที่วิ่ง</th>
                <th className="py-3">ระยะทาง (กม.)</th>
                <th className="py-3">สถานที่วิ่ง</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-gray-500 bg-gray-50"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row, idx) => {
                  const dateText = (row.run_date ?? row.created_at)?.slice(
                    0,
                    10
                  );
                  const distanceText =
                    typeof row.run_distance === "number"
                      ? row.run_distance.toFixed(2)
                      : "-";

                  const imgSrc = displayUrls[row.id] ?? null;

                  return (
                    <tr
                      key={row.id}
                      className={`${
                        idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } hover:bg-gray-100`}
                    >
                      <td className="py-3 text-center">{idx + 1}</td>
                      <td className="py-3 text-center">{dateText}</td>
                      <td className="py-3 text-center">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt="run image"
                            width={60}
                            height={60}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 8,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                              display: "inline-block",
                            }}
                            onError={(e) => {
                              console.warn("⚠️ image load error:", imgSrc);
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">{distanceText}</td>
                      <td className="py-3 text-center">
                        {row.run_place ?? "-"}
                      </td>
                      <td className="py-3 text-center">
                        <Link
                          className="text-green-500 mr-5 hover:text-green-700 "
                          href="#"
                        >
                          {" "}
                          แก้ไข{" "}
                        </Link>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-gray-500 bg-gray-50"
                  >
                    ยังไม่มีข้อมูลการวิ่ง
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="w-full px-4 py-4 flex justify-center">
            <Link
              href="/createmyrun"
              className="inline-flex items-center rounded-2xl bg-gray-800 px-6 py-3 text-white font-medium shadow hover:bg-gray-900"
            >
              + เพิ่มข้อมูลการวิ่งของฉัน
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
