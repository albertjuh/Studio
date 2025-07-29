
"use client";

import * as React from "react";
import { useState, Children, isValidElement } from "react";
import type { UseFormReturn, FieldValues, FieldPath, Path, FieldError } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { get } from "react-hook-form";

interface FormStepProps {
  children: React.ReactNode;
  isOptional?: boolean;
}

export function FormStep({ children }: FormStepProps) {
  return <>{children}</>;
}

interface FormStepperProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  children: React.ReactNode;
  onSubmit: (data: T) => void;
  isLoading?: boolean;
  submitText?: string;
  submitIcon?: React.ReactNode;
}

// Helper to recursively find field names in children
const getFieldsInStep = (children: React.ReactNode): Path<any>[] => {
  const fields: Path<any>[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      if (child.props.name) {
        fields.push(child.props.name);
      }
      if (child.props.children) {
        fields.push(...getFieldsInStep(child.props.children));
      }
    }
  });
  return fields;
};

export function FormStepper<T extends FieldValues>({
  form,
  children,
  onSubmit,
  isLoading = false,
  submitText = "Submit",
  submitIcon,
}: FormStepperProps<T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const steps = Children.toArray(children).filter(
    (child): child is React.ReactElement<FormStepProps> => isValidElement(child) && child.type === FormStep
  );

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepElement = steps[currentStep];

  const handleNext = async () => {
    const fieldsToValidate = getFieldsInStep(currentStepElement.props.children);
    
    // Custom validation logic for react-hook-form
    let isValid = true;
    if (fieldsToValidate.length > 0) {
      // Trigger validation for all fields in the current step
      await form.trigger(fieldsToValidate as FieldPath<T>[]);
      
      // Check if any of the fields in the current step have errors
      for (const fieldName of fieldsToValidate) {
        const fieldError = get(form.formState.errors, fieldName) as FieldError | undefined;
        if (fieldError) {
          isValid = false;
          break; // Stop checking if one field is invalid
        }
      }
    }

    if (currentStepElement.props.isOptional || isValid) {
      if (currentStep < totalSteps - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center gap-4 flex-shrink-0">
        <Progress value={progress} className="h-2" />
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Step {currentStep + 1} / {totalSteps}
        </span>
      </div>

      <div className="relative overflow-hidden flex-grow">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute w-full h-full px-1"
          >
            {currentStepElement}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {currentStep < totalSteps - 1 ? (
          <Button type="button" onClick={handleNext} disabled={isLoading}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : submitIcon}
            {submitText}
          </Button>
        )}
      </div>
    </div>
  );
}
