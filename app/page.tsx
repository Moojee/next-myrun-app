import Image from "next/image";
import Link from "next/link";
import runlogo from "./../assets/images/runlogo.jpeg";

export default function Page() {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 md:px-10 lg:px-20 text-center">
        {/* รูปโลโก้ */}
        <Image
          className="mt-10 sm:mt-16 md:mt-20"
          src={runlogo}
          alt="Runlogo"
          width={180}
          height={180}
          priority
        />

        {/* ข้อความหลัก */}
        <h1 className="mt-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-700">
          Welcome To MyRun
        </h1>

        {/* ข้อความรอง */}
        <h3 className="mt-4 text-sm sm:text-base md:text-lg text-gray-500">
          Your Personal Running Record
        </h3>

        <h3 className="mt-2 text-sm sm:text-base md:text-lg text-gray-500">
          You can create and update your running record
        </h3>

        {/* ปุ่มไปหน้าถัดไป */}
        <Link
          href="/showallmyrun"
          className="mt-8 sm:mt-10 bg-gray-600 hover:bg-gray-800 text-white px-8 py-3 sm:px-10 sm:py-3 md:px-12 md:py-4 rounded-3xl transition-all duration-300"
        >
          เข้าสู่หน้าข้อมูลการวิ่งของฉัน
        </Link>
      </div>
    </>
  );
}
